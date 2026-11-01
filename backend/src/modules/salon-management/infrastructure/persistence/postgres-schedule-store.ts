import { Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { notFound } from '../../../../common/domain/capability-error.js';
import { ScheduleStore } from '../../application/ports/management-stores.js';
import type {
  ExceptionInput,
  ScheduleException,
  WeeklyInterval,
  WriteCommand,
  PageQuery,
} from '../../domain/management.types.js';
import { clock, minute } from '../../domain/schedule-policy.js';
import { BusinessWriteTransaction } from './business-write-transaction.js';
import { cursor, page, scope } from './management-pagination.js';
interface RawInterval {
  exception_id: string;
  start_minute: number;
  end_minute: number;
}
const exceptionProjection = `id,local_date::text AS local_date,staff_id,closed,version,(deleted_at IS NOT NULL) AS deleted`;
@Injectable()
export class PostgresScheduleStore extends ScheduleStore {
  constructor(private readonly write: BusinessWriteTransaction) {
    super();
  }
  private async parent(client: Pool | PoolClient, business: string, staff: string | null) {
    const r = staff
      ? await client.query<{ hours_version: number }>(
          'SELECT hours_version FROM app.staff_profiles WHERE business_id=$1 AND id=$2',
          [business, staff],
        )
      : await client.query<{ hours_version: number }>(
          'SELECT hours_version FROM app.businesses WHERE id=$1',
          [business],
        );
    return r.rows[0] ?? notFound();
  }
  async hours(actor: string, business: string, staff: string | null) {
    await this.write.owner(actor, business);
    const client = this.write.database.pool;
    const parent = await this.parent(client, business, staff);
    const r = staff
      ? await client.query<{
          weekday: number;
          start_minute: number;
          end_minute: number;
        }>(
          'SELECT weekday,start_minute,end_minute FROM app.staff_hours WHERE business_id=$1 AND staff_id=$2 ORDER BY weekday,start_minute',
          [business, staff],
        )
      : await client.query<{
          weekday: number;
          start_minute: number;
          end_minute: number;
        }>(
          'SELECT weekday,start_minute,end_minute FROM app.business_hours WHERE business_id=$1 ORDER BY weekday,start_minute',
          [business],
        );
    return {
      version: parent.hours_version,
      intervals: r.rows.map((row) => ({
        weekday: row.weekday,
        start_local: clock(row.start_minute),
        end_local: clock(row.end_minute),
      })),
    };
  }
  async replaceHours(command: WriteCommand, staff: string | null, intervals: WeeklyInterval[]) {
    return this.write.run(command, async (tx) => {
      const business = command.businessId;
      if (!business) throw new Error('Missing tenant');
      if (staff)
        await tx.query(
          'SELECT id FROM app.staff_profiles WHERE business_id=$1 AND id=$2 FOR UPDATE',
          [business, staff],
        );
      const parent = await this.parent(tx, business, staff);
      this.write.version(parent.hours_version, command.version);
      const days = intervals.map((x) => x.weekday),
        starts = intervals.map((x) => minute(x.start_local)),
        ends = intervals.map((x) => minute(x.end_local, true));
      if (staff) {
        await tx.query('DELETE FROM app.staff_hours WHERE business_id=$1 AND staff_id=$2', [
          business,
          staff,
        ]);
        await tx.query(
          'INSERT INTO app.staff_hours(business_id,staff_id,weekday,start_minute,end_minute) SELECT $1,$2,* FROM unnest($3::integer[],$4::integer[],$5::integer[])',
          [business, staff, days, starts, ends],
        );
        await tx.query(
          'UPDATE app.staff_profiles SET hours_version=hours_version+1 WHERE business_id=$1 AND id=$2',
          [business, staff],
        );
      } else {
        await tx.query('DELETE FROM app.business_hours WHERE business_id=$1', [business]);
        await tx.query(
          'INSERT INTO app.business_hours(business_id,weekday,start_minute,end_minute) SELECT $1,* FROM unnest($2::integer[],$3::integer[],$4::integer[])',
          [business, days, starts, ends],
        );
        await tx.query('UPDATE app.businesses SET hours_version=hours_version+1 WHERE id=$1', [
          business,
        ]);
      }
      return { version: parent.hours_version + 1, intervals };
    });
  }
  private async attachIntervals(
    client: Pool | PoolClient,
    rows: ScheduleException[],
    business: string,
  ) {
    if (!rows.length) return rows;
    const r = await client.query<RawInterval>(
      'SELECT exception_id,start_minute,end_minute FROM app.exception_intervals WHERE business_id=$1 AND exception_id=ANY($2::uuid[]) ORDER BY start_minute',
      [business, rows.map((x) => x.id)],
    );
    return rows.map((row) => ({
      ...row,
      intervals: r.rows
        .filter((x) => x.exception_id === row.id)
        .map((x) => ({
          start_local: clock(x.start_minute),
          end_local: clock(x.end_minute),
        })),
    }));
  }
  async exceptions(actor: string, business: string, query: PageQuery) {
    await this.write.owner(actor, business);
    const s = scope(query, business, 'exceptions'),
      [at, id] = cursor(query, s);
    const r = await this.write.database.pool.query<ScheduleException & { cursor_time: string }>(
      `SELECT ${exceptionProjection},created_at::text AS cursor_time FROM app.schedule_exceptions WHERE business_id=$1 AND deleted_at IS NULL AND local_date BETWEEN $2::date AND $3::date AND ($4::uuid IS NULL OR staff_id=$4) AND ($5::timestamptz IS NULL OR (created_at,id)>($5::timestamptz,$6::uuid)) ORDER BY created_at,id LIMIT $7`,
      [business, query.from, query.to, query.staff_id ?? null, at, id, query.limit + 1],
    );
    return page(await this.attachIntervals(this.write.database.pool, r.rows, business), query, s);
  }
  async exception(actor: string, business: string, id: string) {
    await this.write.owner(actor, business);
    return this.readException(this.write.database.pool, business, id);
  }
  private async readException(client: Pool | PoolClient, business: string, id: string) {
    const r = await client.query<ScheduleException>(
      `SELECT ${exceptionProjection} FROM app.schedule_exceptions WHERE business_id=$1 AND id=$2`,
      [business, id],
    );
    if (!r.rows[0]) notFound();
    return (await this.attachIntervals(client, r.rows, business))[0] ?? notFound();
  }
  private async saveIntervals(tx: PoolClient, business: string, id: string, input: ExceptionInput) {
    await tx.query('DELETE FROM app.exception_intervals WHERE business_id=$1 AND exception_id=$2', [
      business,
      id,
    ]);
    await tx.query(
      'INSERT INTO app.exception_intervals(business_id,exception_id,start_minute,end_minute) SELECT $1,$2,* FROM unnest($3::integer[],$4::integer[])',
      [
        business,
        id,
        input.intervals.map((x) => minute(x.start_local)),
        input.intervals.map((x) => minute(x.end_local, true)),
      ],
    );
  }
  async createException(command: WriteCommand, input: ExceptionInput) {
    return this.write.run(command, async (tx) => {
      const business = command.businessId;
      if (!business) throw new Error('Missing tenant');
      if (input.staff_id) await this.parent(tx, business, input.staff_id);
      const r = await tx.query<{ id: string }>(
        'INSERT INTO app.schedule_exceptions(business_id,staff_id,local_date,closed) VALUES($1,$2,$3,$4) RETURNING id',
        [business, input.staff_id, input.local_date, input.closed],
      );
      const row = r.rows[0] ?? notFound();
      await this.saveIntervals(tx, business, row.id, input);
      return this.readException(tx, business, row.id);
    });
  }
  async updateException(
    command: WriteCommand,
    id: string,
    input: ExceptionInput | null,
    remove: boolean,
  ) {
    return this.write.run(command, async (tx) => {
      const business = command.businessId;
      if (!business) throw new Error('Missing tenant');
      const old = await this.readException(tx, business, id);
      if (old.deleted) notFound();
      this.write.version(old.version, command.version);
      if (remove)
        await tx.query(
          'UPDATE app.schedule_exceptions SET deleted_at=now(),version=version+1,updated_at=now() WHERE business_id=$1 AND id=$2',
          [business, id],
        );
      else if (input) {
        await tx.query(
          'UPDATE app.schedule_exceptions SET closed=$3,version=version+1,updated_at=now() WHERE business_id=$1 AND id=$2',
          [business, id, input.closed],
        );
        await this.saveIntervals(tx, business, id, input);
      }
      return this.readException(tx, business, id);
    });
  }
}
