import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import {
  invalid,
  notFound,
  conflict,
  CapabilityError,
} from '../../../../common/domain/capability-error.js';
import { PublicationStore } from '../../application/ports/publication-store.js';
import type { WriteCommand, PageQuery } from '../../domain/management.types.js';
import type { Publication, Decision } from '../../domain/publication.types.js';
import { transition, assertReady } from '../../domain/publication-policy.js';
import { BusinessWriteTransaction } from './business-write-transaction.js';
import { readProfile } from './public-profile-query.js';
import { readPublication } from './publication-query.js';
import { cursor, page } from './management-pagination.js';
@Injectable()
export class PostgresPublicationStore extends PublicationStore {
  constructor(private readonly write: BusinessWriteTransaction) {
    super();
  }
  async get(actor: string, business: string) {
    await this.write.owner(actor, business);
    return readPublication(this.write.database.pool, business);
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
        `SELECT 1 FROM app.publication_events WHERE business_id=$1 AND action IN ('request','publish') LIMIT 1`,
        [business],
      );
      if (!exists.rowCount) notFound();
      const publication = await readPublication(tx, business);
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
    consentReference = status.request_id,
  ) {
    const id = randomUUID();
    const reference = action === 'request' || action === 'publish' ? id : consentReference;
    await tx.query(
      `INSERT INTO app.publication_events(id,business_id,actor_id,action,revision,request_id,reason,consent,publication_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        this.business(command),
        command.actorId,
        action,
        status.content_revision,
        reference,
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
        next === 'published' || next === 'pending_review' ? reference : null,
      ],
    );
    return readPublication(tx, this.business(command));
  }
  request(command: WriteCommand, consent: boolean) {
    return this.write.runPublication(command, async (tx) => {
      const status = await readPublication(tx, this.business(command));
      this.write.version(status.version, command.version);
      const next = transition(status.state, 'request');
      assertReady(status.issues);
      if (!consent) invalid('consent', 'رضایت انتشار اطلاعات عمومی لازم است.');
      return this.event(tx, command, status, 'publish', next, null, true);
    });
  }
  withdraw(command: WriteCommand) {
    return this.write.runPublication(command, async (tx) => {
      const status = await readPublication(tx, this.business(command));
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
      const status = await readPublication(tx, this.business(command));
      this.write.version(status.version, command.version);
      if (status.request_id !== requestId || status.content_revision !== contentRevision)
        conflict('STALE_REVIEW', 'درخواست بررسی تغییر کرده است.');
      const next = transition(status.state, decision);
      let consentReference = status.request_id;
      if (decision === 'approve') assertReady(status.issues);
      if (decision !== 'approve' && !reason) invalid('reason', 'دلیل تصمیم را بنویسید.');
      if (decision === 'approve') {
        // Only moderation can restore a suspended salon. Keep its existing owner consent as provenance.
        if (status.state === 'suspended') {
          const latest = await tx.query<{ id: string }>(
            `SELECT id FROM app.publication_events WHERE business_id=$1 AND action IN ('request','publish') AND consent ORDER BY publication_version DESC LIMIT 1`,
            [this.business(command)],
          );
          consentReference = latest.rows[0]?.id ?? null;
        }
        const submitted = await tx.query(
          `SELECT 1 FROM app.publication_events WHERE id=$1 AND business_id=$2 AND action IN ('request','publish') AND consent AND ($4 OR revision=$3)`,
          [
            consentReference,
            this.business(command),
            status.content_revision,
            status.state === 'suspended',
          ],
        );
        if (!submitted.rowCount)
          throw new CapabilityError(409, 'STALE_REVIEW', 'رضایت یا محتوای درخواست تغییر کرده است.');
      }
      return this.event(tx, command, status, decision, next, reason, false, consentReference);
    });
  }
}
