import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { conflict, notFound } from '../../../../common/domain/capability-error.js';
import { Clock, dayBoundary } from '../../../salon-management/public.js';
import { SalonOperationsStore } from '../../application/salon-operations-store.js';
import { BookingStore } from '../../application/booking-store.js';
import type { BookingCommand, BookingListQuery } from '../../domain/booking.types.js';
import {
  ensureOutcome,
  ensureBlock,
  type OutcomeInput,
  type BlockInput,
  type ScheduleBlock,
} from '../../domain/salon-operations.js';
import { BookingTransaction, requireOwner } from './booking-transaction.js';
import { readChangeAppointment } from './booking-change-query.js';
import { appointment } from './appointment-query.js';
type BlockRow = Omit<ScheduleBlock, 'starts_at' | 'ends_at' | 'released_at'> & {
  starts_at: Date;
  ends_at: Date;
  released_at: Date | null;
};
function block(row: BlockRow): ScheduleBlock {
  return {
    ...row,
    starts_at: row.starts_at.toISOString(),
    ends_at: row.ends_at.toISOString(),
    released_at: row.released_at?.toISOString() ?? null,
  };
}
const columns =
  'id,business_id,staff_id,staff_name,starts_at,ends_at,reason,version,released_at,release_reason';
async function readBlock(db: Pool | PoolClient, business: string, id: string, lock = false) {
  const r = await db.query<BlockRow>(
    `SELECT ${columns} FROM app.schedule_blocks WHERE business_id=$1 AND id=$2${lock ? ' FOR UPDATE' : ''}`,
    [business, id],
  );
  return r.rows[0] ?? notFound();
}
@Injectable()
export class PostgresSalonOperations extends SalonOperationsStore {
  constructor(
    private readonly database: DatabaseProvider,
    private readonly transaction: BookingTransaction,
    private readonly bookings: BookingStore,
    private readonly clock: Clock,
  ) {
    super();
  }
  async outcome(
    command: BookingCommand,
    business: string,
    id: string,
    input: OutcomeInput,
    version: number,
  ) {
    const target = await this.transaction.run(command, business, async (tx) => {
      const row = await readChangeAppointment(tx, command.actor, id, business, true);
      ensureOutcome(appointment(row), input, version, this.clock.now());
      await tx.query(
        'INSERT INTO app.booking_events(appointment_id,version,actor_id,action,reason,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)',
        [
          id,
          row.version + 1,
          command.actor,
          row.status === 'confirmed' ? 'outcome' : 'corrected',
          input.reason,
          JSON.stringify({ status_before: row.status, status_after: input.status }),
        ],
      );
      await tx.query('UPDATE app.appointments SET status=$2,version=version+1 WHERE id=$1', [
        id,
        input.status,
      ]);
      return id;
    });
    return this.bookings.get(command.actor, target, business);
  }
  async createBlock(command: BookingCommand, business: string, input: BlockInput) {
    const id = await this.transaction.run(command, business, async (tx) => {
      ensureBlock(input, this.clock.now());
      const s = await tx.query<{ display_name: string }>(
        'SELECT display_name FROM app.staff_profiles WHERE business_id=$1 AND id=$2 AND active',
        [business, input.staff_id],
      );
      const staff = s.rows[0] ?? notFound(),
        id = randomUUID();
      await tx.query(
        'INSERT INTO app.schedule_blocks(id,business_id,staff_id,staff_name,starts_at,ends_at,reason,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          id,
          business,
          input.staff_id,
          staff.display_name,
          input.starts_at,
          input.ends_at,
          input.reason,
          command.actor,
        ],
      );
      await tx.query(
        'INSERT INTO app.schedule_allocations(block_id,business_id,staff_id,occupied_start,occupied_end) VALUES($1,$2,$3,$4,$5)',
        [id, business, input.staff_id, input.starts_at, input.ends_at],
      );
      return id;
    });
    return block(await readBlock(this.database.pool, business, id));
  }
  async releaseBlock(
    command: BookingCommand,
    business: string,
    id: string,
    reason: string,
    version: number,
  ) {
    const target = await this.transaction.run(command, business, async (tx) => {
      const row = await readBlock(tx, business, id, true);
      if (row.version !== version)
        conflict('VERSION_CONFLICT', 'مسدودی تغییر کرده است؛ دوباره دریافت کنید.');
      if (row.released_at) conflict('BLOCK_RELEASED', 'مسدودی قبلاً رفع شده است.');
      const now = this.clock.now();
      await tx.query(
        'UPDATE app.schedule_blocks SET version=version+1,released_at=$2,release_reason=$3,released_by=$4 WHERE id=$1',
        [id, now, reason, command.actor],
      );
      await tx.query('UPDATE app.schedule_allocations SET released_at=$2 WHERE block_id=$1', [
        id,
        now,
      ]);
      return id;
    });
    return block(await readBlock(this.database.pool, business, target));
  }
  async resolveBlock(
    actor: string,
    business: string,
    key: string,
    operation: 'block-create' | 'block-release',
  ) {
    const tx = await this.database.pool.connect();
    try {
      await tx.query('BEGIN');
      await requireOwner(tx, actor, business);
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        JSON.stringify(['booking', actor, operation, key]),
      ]);
      const r = await tx.query<{ block_id: string }>(
        'SELECT w.block_id FROM app.booking_writes w JOIN app.schedule_blocks business ON business.id=w.block_id WHERE w.actor_id=$1 AND w.operation=$2 AND w.key=$3 AND business.business_id=$4',
        [actor, operation, key, business],
      );
      const row = await readBlock(tx, business, (r.rows[0] ?? notFound()).block_id);
      await requireOwner(tx, actor, business);
      await tx.query('COMMIT');
      return block(row);
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
  }
  async overview(actor: string, business: string, q: BookingListQuery) {
    const tx = await this.database.pool.connect();
    try {
      await tx.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await requireOwner(tx, actor, business);
      if (!q.date) throw new Error('Validated agenda date required');
      const now = this.clock.now(),
        from = new Date(dayBoundary(q.date, 0)),
        to = new Date(dayBoundary(q.to ?? q.date, 1440, true));
      const counts = await tx.query<Record<string, number>>(
        `SELECT count(*)::int total,count(*) FILTER(WHERE status='confirmed')::int confirmed,count(*) FILTER(WHERE status='completed')::int completed,count(*) FILTER(WHERE status='cancelled')::int cancelled,count(*) FILTER(WHERE status='no_show')::int no_show,count(*) FILTER(WHERE status='confirmed' AND ends_at<=$5)::int awaiting_outcome FROM app.appointments WHERE business_id=$1 AND starts_at>=$2 AND starts_at<$3 AND ($4::uuid IS NULL OR staff_id=$4)`,
        [business, from, to, q.staff_id ?? null, now],
      );
      const blocks = await tx.query<BlockRow>(
        `SELECT ${columns} FROM app.schedule_blocks WHERE business_id=$1 AND starts_at<$3 AND ends_at>$2 AND ($4::uuid IS NULL OR staff_id=$4) ORDER BY (released_at IS NOT NULL),starts_at,id LIMIT 201`,
        [business, from, to, q.staff_id ?? null],
      );
      await tx.query('COMMIT');
      return {
        checked_at: now.toISOString(),
        summary: counts.rows[0] ?? {},
        blocks: blocks.rows.slice(0, 200).map(block),
        blocks_truncated: blocks.rows.length > 200,
      };
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
  }
}
