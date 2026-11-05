import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { notFound } from '../../../../common/domain/capability-error.js';
import { BookingStore } from '../../application/booking-store.js';
import {
  BOOKING_POLICY,
  ensureCancellable,
  ensureCustomerCapacity,
  ensureBookingWindow,
} from '../../domain/booking-policy.js';
import { chooseSlot } from '../../domain/choose-slot.js';
import type {
  BookingCommand,
  CreateBooking,
  BookingSnapshot,
  BookingListQuery,
} from '../../domain/booking.types.js';
import { readSchedule, busyByStaff } from '../../../salon-management/persistence-contract.js';
import {
  Clock,
  localDate,
  dayBoundary,
  MINUTE_MS,
  calculateAvailability,
  availabilityPolicy,
} from '../../../salon-management/public.js';
import type { AvailabilityQuery } from '../../../salon-management/public.js';
import { BookingTransaction, requireOwner } from './booking-transaction.js';
import { appointment, appointmentColumns, type AppointmentRow } from './appointment-query.js';
@Injectable()
export class PostgresBookingStore extends BookingStore {
  constructor(
    private readonly database: DatabaseProvider,
    private readonly transaction: BookingTransaction,
    private readonly clock: Clock,
  ) {
    super();
  }
  async resolve(actor: string, key: string, operation: BookingCommand['operation']) {
    const tx = await this.database.pool.connect();
    try {
      await tx.query('BEGIN');
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        JSON.stringify(['booking', actor, operation, key]),
      ]);
      const r = await tx.query<{ appointment_id: string; business_id: string }>(
        'SELECT w.appointment_id,a.business_id FROM app.booking_writes w JOIN app.appointments a ON a.id=w.appointment_id WHERE w.actor_id=$1 AND w.operation=$2 AND w.key=$3',
        [actor, operation, key],
      );
      await tx.query('COMMIT');
      const found = r.rows[0] ?? notFound();
      return this.get(
        actor,
        found.appointment_id,
        operation === 'online' ? undefined : found.business_id,
      );
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }
  }
  async create(command: BookingCommand, input: CreateBooking, now: Date) {
    const manual = command.operation === 'manual';
    const id = await this.transaction.run(command, input.business_id, async (tx) => {
      const checkedAt = new Date(Math.max(now.getTime(), this.clock.now().getTime()));
      ensureBookingWindow(input.starts_at, checkedAt);
      if (!manual) {
        const cap = await tx.query<{ count: number }>(
          "SELECT count(*)::integer AS count FROM app.appointments WHERE booking_user_id=$1 AND business_id=$2 AND source='online' AND status='confirmed' AND starts_at>$3",
          [command.actor, input.business_id, checkedAt],
        );
        ensureCustomerCapacity(cap.rows[0]?.count ?? 0);
      }
      const date = localDate(new Date(input.starts_at));
      const schedule = await readSchedule(
        tx,
        input.business_id,
        { service_id: input.service_id, staff_id: input.staff_id, from: date, to: date },
        manual ? 'manual' : 'public',
      );
      const staffId = chooseSlot(schedule, input, checkedAt, busyByStaff(schedule), manual);
      const staff = schedule.staff.find((s) => s.id === staffId);
      if (!staff) notFound();
      const s = schedule.service;
      const snapshot: BookingSnapshot = {
        business_name: schedule.business_name,
        business_address: schedule.business_address,
        business_phone: schedule.business_phone,
        service_name: s.name,
        staff_name: staff.name,
        price_irr: s.price_irr,
        duration_minutes: s.duration_minutes,
        buffer_before_minutes: s.buffer_before_minutes,
        buffer_after_minutes: s.buffer_after_minutes,
        service_version: s.version,
        customer_name: input.customer_name,
        customer_mobile: input.customer_mobile,
        timezone: 'Asia/Tehran',
        policy: BOOKING_POLICY,
      };
      const id = randomUUID(),
        start = new Date(input.starts_at),
        end = new Date(start.getTime() + s.duration_minutes * MINUTE_MS);
      await tx.query(
        `INSERT INTO app.appointments(id,business_id,service_id,staff_id,booking_user_id,created_by,code,source,starts_at,ends_at,snapshot,notice_override_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)`,
        [
          id,
          input.business_id,
          input.service_id,
          staffId,
          manual ? null : command.actor,
          command.actor,
          randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase(),
          manual ? 'manual' : 'online',
          start,
          end,
          JSON.stringify(snapshot),
          input.notice_override_reason,
        ],
      );
      await tx.query(
        'INSERT INTO app.schedule_allocations(appointment_id,business_id,staff_id,occupied_start,occupied_end) VALUES($1,$2,$3,$4,$5)',
        [
          id,
          input.business_id,
          staffId,
          new Date(start.getTime() - s.buffer_before_minutes * MINUTE_MS),
          new Date(end.getTime() + s.buffer_after_minutes * MINUTE_MS),
        ],
      );
      await tx.query(
        "INSERT INTO app.booking_events(appointment_id,version,actor_id,action,reason) VALUES($1,1,$2,'created',$3)",
        [id, command.actor, input.notice_override_reason],
      );
      return id;
    });
    return this.get(command.actor, id, manual ? input.business_id : undefined);
  }
  async cancel(
    command: BookingCommand,
    business: string,
    id: string,
    reason: string,
    version: number,
    now: Date,
  ) {
    const target = await this.transaction.run(command, business, async (tx) => {
      const checkedAt = new Date(Math.max(now.getTime(), this.clock.now().getTime()));
      const r = await tx.query<AppointmentRow>(
        `SELECT ${appointmentColumns} FROM app.appointments a WHERE a.id=$1 AND a.business_id=$2 FOR UPDATE`,
        [id, business],
      );
      const a = r.rows[0] ?? notFound();
      ensureCancellable(a.status, a.starts_at, checkedAt, a.version, version);
      await tx.query(
        "UPDATE app.appointments SET status='cancelled',version=version+1,cancelled_at=$3,cancellation_reason=$4 WHERE id=$1 AND business_id=$2",
        [id, business, checkedAt, reason],
      );
      await tx.query('UPDATE app.schedule_allocations SET released_at=$2 WHERE appointment_id=$1', [
        id,
        checkedAt,
      ]);
      await tx.query(
        "INSERT INTO app.booking_events(appointment_id,version,actor_id,action,reason) VALUES($1,$2,$3,'cancelled',$4)",
        [id, a.version + 1, command.actor, reason],
      );
      return id;
    });
    return this.get(command.actor, target, business);
  }
  async get(actor: string, id: string, business?: string) {
    if (business) await requireOwner(this.database.pool, actor, business);
    const r = await this.database.pool.query<AppointmentRow>(
      `SELECT ${appointmentColumns} FROM app.appointments a WHERE a.id=$1 AND ${business ? 'a.business_id=$2' : 'a.booking_user_id=$2'}`,
      [id, business ?? actor],
    );
    return appointment(r.rows[0] ?? notFound());
  }
  async list(actor: string, q: BookingListQuery, now: Date, business?: string) {
    if (business) await requireOwner(this.database.pool, actor, business);
    const params: unknown[] = [business ?? actor];
    let where = business ? 'a.business_id=$1' : 'a.booking_user_id=$1';
    const add = (value: unknown) => {
      params.push(value);
      return '$' + params.length;
    };
    if (business && q.date) {
      where += ` AND a.starts_at>=${add(new Date(dayBoundary(q.date, 0)))} AND a.starts_at<${add(new Date(dayBoundary(q.date, 1440, true)))}`;
      if (q.staff_id) where += ` AND a.staff_id=${add(q.staff_id)}`;
    } else where += ` AND a.ends_at${q.period === 'past' ? '<=' : '>'}${add(now)}`;
    const direction = !business && q.period === 'past' ? 'DESC' : 'ASC',
      comparison = direction === 'ASC' ? '>' : '<';
    if (q.cursor) {
      // Cursor must belong to the same authorized, filtered result set.
      const c = add(q.cursor);
      where += ` AND (a.starts_at,a.id) ${comparison} (SELECT z.starts_at,z.id FROM app.appointments z WHERE z.id=${c} AND ${business ? 'z.business_id' : 'z.booking_user_id'}=$1)`;
    }
    const r = await this.database.pool.query<AppointmentRow>(
      `SELECT ${appointmentColumns} FROM app.appointments a WHERE ${where} ORDER BY a.starts_at ${direction},a.id ${direction} LIMIT ${add(q.limit + 1)}`,
      params,
    );
    const more = r.rows.length > q.limit,
      items = r.rows.slice(0, q.limit).map(appointment);
    return { items, next_cursor: more ? (items.at(-1)?.id ?? null) : null };
  }
  async options(actor: string, business: string, query: AvailabilityQuery, now: Date) {
    await requireOwner(this.database.pool, actor, business);
    const s = await readSchedule(this.database.pool, business, query, 'manual');
    const { id, name, price_irr, duration_minutes } = s.service;
    return {
      ...query,
      business_id: business,
      service: { id, name, price_irr, duration_minutes },
      timezone: s.timezone,
      checked_at: now.toISOString(),
      availability_basis: 'live_occupancy' as const,
      booking_enabled: true as const,
      policy: availabilityPolicy(now),
      days: calculateAvailability(s, query, now, busyByStaff(s), 0),
    };
  }
}
