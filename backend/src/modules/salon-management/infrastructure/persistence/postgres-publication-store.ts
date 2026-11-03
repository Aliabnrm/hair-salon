import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import {
  invalid,
  notFound,
  conflict,
  CapabilityError,
} from '../../../../common/domain/capability-error.js';
import { PublicationStore } from '../../application/ports/publication-store.js';
import type { WriteCommand, PageQuery } from '../../domain/management.types.js';
import type { Publication, PublicProfile, Decision } from '../../domain/publication.types.js';
import { readiness, transition, assertReady } from '../../domain/publication-policy.js';
import { BusinessWriteTransaction } from './business-write-transaction.js';
import { publicProfileSql, readProfile } from './public-profile-query.js';
import { cursor, page } from './management-pagination.js';
@Injectable()
export class PostgresPublicationStore extends PublicationStore {
  constructor(private readonly write: BusinessWriteTransaction) {
    super();
  }
  private async status(db: Pool | PoolClient, business: string): Promise<Publication> {
    const r = await db.query<{
      state: Publication['state'];
      version: number;
      content_revision: number;
      request_id: string | null;
      profile: PublicProfile;
      service_minutes: Record<string, number>;
      owner_active: boolean;
      history: Publication['history'];
    }>(
      `SELECT b.state,b.publication_version AS version,b.content_revision,b.current_request_id AS request_id,${publicProfileSql} AS profile,
   COALESCE((SELECT jsonb_object_agg(s.id,s.duration_minutes+s.buffer_before_minutes+s.buffer_after_minutes) FROM app.services s WHERE s.business_id=b.id AND s.active),'{}'::jsonb) AS service_minutes,
   EXISTS(SELECT 1 FROM app.business_memberships m WHERE m.business_id=b.id AND m.active AND m.role='owner') AS owner_active,
   COALESCE((SELECT jsonb_agg(jsonb_build_object('id',h.id,'action',h.action,'revision',h.revision,'request_id',h.request_id,'reason',h.reason,'created_at',h.created_at::text) ORDER BY h.publication_version DESC) FROM (SELECT id,action,revision,request_id,reason,created_at,publication_version FROM app.publication_events WHERE business_id=b.id ORDER BY publication_version DESC LIMIT 50) h),'[]'::jsonb) AS history FROM app.businesses b WHERE b.id=$1`,
      [business],
    );
    const row = r.rows[0] ?? notFound();
    return {
      state: row.state,
      version: row.version,
      content_revision: row.content_revision,
      request_id: row.request_id,
      issues: readiness(row.profile, row.owner_active, row.service_minutes),
      history: row.history,
    };
  }
  async get(actor: string, business: string) {
    await this.write.owner(actor, business);
    return this.status(this.write.database.pool, business);
  }
  async preview(actor: string, business: string) {
    await this.write.owner(actor, business);
    return readProfile(this.write.database.pool, business);
  }
  async access(actor: string) {
    const r = await this.write.database.pool.query(
      'SELECT 1 FROM app.reviewer_permissions WHERE user_id=$1 AND active',
      [actor],
    );
    return { can_review: Boolean(r.rowCount) };
  }
  async queue(actor: string, query: PageQuery) {
    await this.write.reviewer(actor);
    const scope = 'review:' + actor;
    const [at, id] = cursor(query, scope);
    const r = await this.write.database.pool.query<{
      id: string;
      name: string;
      state: string;
      cursor_time: string;
    }>(
      `SELECT b.id,b.name,b.state,b.created_at::text AS cursor_time FROM app.businesses b
  WHERE b.state IN ('pending_review','published','suspended') AND NOT EXISTS(SELECT 1 FROM app.business_memberships m WHERE m.business_id=b.id AND m.user_id=$1 AND m.active)
  AND ($2::timestamptz IS NULL OR (b.created_at,b.id)>($2::timestamptz,$3::uuid)) ORDER BY b.created_at,b.id LIMIT $4`,
      [actor, at, id, query.limit + 1],
    );
    return page(r.rows, query, scope);
  }
  async review(actor: string, business: string) {
    await this.write.reviewer(actor, business);
    const tx = await this.write.database.pool.connect();
    try {
      await tx.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const exists = await tx.query(
        `SELECT 1 FROM app.publication_events WHERE business_id=$1 AND action='request' LIMIT 1`,
        [business],
      );
      if (!exists.rowCount) notFound();
      const publication = await this.status(tx, business);
      const profile = await readProfile(tx, business);
      await tx.query('COMMIT');
      return { publication, profile };
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
  }
  private business(command: WriteCommand) {
    return command.businessId ?? invalid('businessId');
  }
  private async event(
    tx: PoolClient,
    command: WriteCommand,
    status: Publication,
    action: string,
    next: Publication['state'],
    reason: string | null,
    consent = false,
  ) {
    const id = randomUUID();
    await tx.query(
      `INSERT INTO app.publication_events(id,business_id,actor_id,action,revision,request_id,reason,consent,publication_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        this.business(command),
        command.actorId,
        action,
        status.content_revision,
        action === 'request' ? id : status.request_id,
        reason,
        consent,
        status.version + 1,
      ],
    );
    await tx.query(
      `UPDATE app.businesses SET state=$2,version=version+1,publication_version=publication_version+1,current_request_id=$3 WHERE id=$1`,
      [
        this.business(command),
        next,
        action === 'request' ? id : next === 'published' ? status.request_id : null,
      ],
    );
    return this.status(tx, this.business(command));
  }
  request(command: WriteCommand, consent: boolean) {
    return this.write.runPublication(command, async (tx) => {
      const status = await this.status(tx, this.business(command));
      this.write.version(status.version, command.version);
      const next = transition(status.state, 'request');
      assertReady(status.issues);
      if (status.state === 'suspended') {
        const last = await tx.query<{ revision: number }>(
          `SELECT revision FROM app.publication_events WHERE business_id=$1 AND action='suspend' ORDER BY publication_version DESC LIMIT 1`,
          [this.business(command)],
        );
        if ((last.rows[0]?.revision ?? status.content_revision) >= status.content_revision)
          conflict('CORRECTION_REQUIRED', 'پس از اصلاح اطلاعات، درخواست تازه بفرستید.');
      }
      if (!consent) invalid('consent', 'رضایت انتشار اطلاعات عمومی لازم است.');
      return this.event(tx, command, status, 'request', next, null, true);
    });
  }
  withdraw(command: WriteCommand) {
    return this.write.runPublication(command, async (tx) => {
      const status = await this.status(tx, this.business(command));
      this.write.version(status.version, command.version);
      return this.event(
        tx,
        command,
        status,
        'withdraw',
        transition(status.state, 'withdraw'),
        null,
      );
    });
  }
  decide(
    command: WriteCommand,
    decision: Decision,
    requestId: string | null,
    reason: string | null,
    contentRevision: number,
  ) {
    return this.write.runReview(command, async (tx) => {
      const status = await this.status(tx, this.business(command));
      this.write.version(status.version, command.version);
      if (status.request_id !== requestId || status.content_revision !== contentRevision)
        conflict('STALE_REVIEW', 'درخواست بررسی تغییر کرده است.');
      const next = transition(status.state, decision);
      if (decision === 'approve') assertReady(status.issues);
      if (decision !== 'approve' && !reason) invalid('reason', 'دلیل تصمیم را بنویسید.');
      if (decision === 'approve') {
        const submitted = await tx.query(
          `SELECT 1 FROM app.publication_events WHERE id=$1 AND business_id=$2 AND action='request' AND consent AND revision=$3`,
          [requestId, this.business(command), status.content_revision],
        );
        if (!submitted.rowCount)
          throw new CapabilityError(409, 'STALE_REVIEW', 'رضایت یا محتوای درخواست تغییر کرده است.');
      }
      return this.event(tx, command, status, decision, next, reason);
    });
  }
}
