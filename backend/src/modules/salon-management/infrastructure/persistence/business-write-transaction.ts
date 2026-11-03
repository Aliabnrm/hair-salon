import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { CapabilityError, conflict, notFound } from '../../../../common/domain/capability-error.js';
import type { WriteCommand } from '../../domain/management.types.js';
@Injectable()
export class BusinessWriteTransaction {
  constructor(readonly database: DatabaseProvider) {}
  async owner(actor: string, business: string, tx?: PoolClient): Promise<void> {
    const r = await (tx ?? this.database.pool).query(
      "SELECT 1 FROM app.business_memberships WHERE business_id=$1 AND user_id=$2 AND active=true AND role='owner'",
      [business, actor],
    );
    if (!r.rowCount) notFound();
  }
  async reviewer(actor: string, business?: string, tx?: PoolClient): Promise<void> {
    const db = tx ?? this.database.pool;
    const permission = await db.query(
      'SELECT user_id FROM app.reviewer_permissions WHERE user_id=$1 AND active' +
        (tx ? ' FOR SHARE' : ''),
      [actor],
    );
    if (!permission.rowCount)
      throw new CapabilityError(403, 'REVIEW_FORBIDDEN', 'دسترسی بررسی انتشار ندارید.');
    if (business) {
      const own = await db.query(
        'SELECT 1 FROM app.business_memberships WHERE user_id=$1 AND business_id=$2 AND active',
        [actor, business],
      );
      if (own.rowCount)
        throw new CapabilityError(403, 'SELF_REVIEW_FORBIDDEN', 'بررسی سالن خودتان مجاز نیست.');
    }
  }
  run<T extends object>(command: WriteCommand, action: (tx: PoolClient) => Promise<T>): Promise<T> {
    return this.execute(command, action, 'owner', true);
  }
  runPublication<T extends object>(
    command: WriteCommand,
    action: (tx: PoolClient) => Promise<T>,
  ): Promise<T> {
    return this.execute(command, action, 'owner', false);
  }
  runReview<T extends object>(
    command: WriteCommand,
    action: (tx: PoolClient) => Promise<T>,
  ): Promise<T> {
    return this.execute(command, action, 'reviewer', false);
  }
  private async execute<T extends object>(
    command: WriteCommand,
    action: (tx: PoolClient) => Promise<T>,
    authority: 'owner' | 'reviewer',
    contentMutation: boolean,
  ): Promise<T> {
    const tx = await this.database.pool.connect();
    try {
      await tx.query('BEGIN');
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        JSON.stringify([command.actorId, command.operation, command.key]),
      ]);
      if (command.businessId) {
        // Only an authorized tenant can be locked, even on replay.
        await (authority === 'owner'
          ? this.owner(command.actorId, command.businessId, tx)
          : this.reviewer(command.actorId, command.businessId, tx));
        await tx.query('SELECT id FROM app.businesses WHERE id=$1 FOR UPDATE', [
          command.businessId,
        ]);
        await (authority === 'owner'
          ? this.owner(command.actorId, command.businessId, tx)
          : this.reviewer(command.actorId, command.businessId, tx));
      } else await tx.query('SELECT id FROM app.users WHERE id=$1 FOR UPDATE', [command.actorId]);
      const old = await tx.query<{
        fingerprint: string;
        response: T | null;
        valid: boolean;
      }>(
        'SELECT fingerprint,response,cache_expires_at>now() AS valid FROM app.management_writes WHERE actor_id=$1 AND operation=$2 AND key=$3',
        [command.actorId, command.operation, command.key],
      );
      const record = old.rows[0];
      if (record) {
        if (record.fingerprint !== command.fingerprint)
          conflict('IDEMPOTENCY_CONFLICT', 'کلید درخواست برای اطلاعات دیگری استفاده شده است.');
        if (!record.valid || record.response === null)
          conflict(
            'IDEMPOTENCY_RESULT_EXPIRED',
            'نتیجه قبلی منقضی شده است؛ وضعیت فعلی را بررسی کنید.',
          );
        await tx.query('COMMIT');
        return record.response;
      }
      if (contentMutation && command.businessId) {
        await tx.query(
          `INSERT INTO app.publication_events(business_id,actor_id,action,revision,publication_version,request_id)
          SELECT id,$2,'content_changed',content_revision,publication_version+1,current_request_id FROM app.businesses WHERE id=$1 AND state IN ('published','pending_review')`,
          [command.businessId, command.actorId],
        );
        await tx.query(
          `UPDATE app.businesses SET content_revision=content_revision+1,publication_version=publication_version+1,
          version=version+CASE WHEN state IN ('published','pending_review') AND $2<>'business.update' THEN 1 ELSE 0 END,
          state=CASE WHEN state IN ('published','pending_review') THEN 'draft' ELSE state END,current_request_id=NULL WHERE id=$1`,
          [command.businessId, command.operation],
        );
      }
      const result = await action(tx);
      const target =
        'id' in result && typeof result.id === 'string' ? result.id : command.businessId;
      const business = command.businessId ?? target;
      if (!business) throw new Error('Missing write target');
      await tx.query(
        'INSERT INTO app.management_writes(actor_id,operation,key,fingerprint,response) VALUES($1,$2,$3,$4,$5::jsonb)',
        [
          command.actorId,
          command.operation,
          command.key,
          command.fingerprint,
          JSON.stringify(result),
        ],
      );
      await tx.query(
        'INSERT INTO app.management_audit(actor_id,business_id,action,target_id,request_id) VALUES($1,$2,$3,$4,$5)',
        [command.actorId, business, command.operation, target, command.requestId],
      );
      // Bounded removal of old result payloads; fingerprints remain to prevent late duplicate writes.
      await tx.query(
        'UPDATE app.management_writes SET response=NULL WHERE (actor_id,operation,key) IN (SELECT actor_id,operation,key FROM app.management_writes WHERE cache_expires_at<=now() AND response IS NOT NULL LIMIT 50)',
      );
      await tx.query('COMMIT');
      return result;
    } catch (error) {
      await tx.query('ROLLBACK');
      if (error instanceof Error && 'code' in error) {
        if (error.code === '23P01') conflict('SCHEDULE_CONFLICT', 'بازه‌های کاری هم‌پوشانی دارند.');
        if (error.code === '23505') conflict('EXCEPTION_EXISTS', 'این مورد قبلاً ثبت شده است.');
        if (error.code === '23503' || error.code === '23514')
          throw new CapabilityError(
            422,
            'VALIDATION_FAILED',
            'اطلاعات مرتبط یا بازه‌ها معتبر نیستند.',
          );
        if (error.code === '40P01' || error.code === '40001')
          conflict('WRITE_CONFLICT', 'تغییر هم‌زمان رخ داد؛ با همان کلید دوباره تلاش کنید.');
      }
      throw error;
    } finally {
      tx.release();
    }
  }
  version(actual: number, expected: number | undefined) {
    if (actual !== expected) conflict();
  }
}
