import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { conflict, notFound } from '../../../../common/domain/capability-error.js';
import {
  Clock,
  MINUTE_MS,
  localDate,
  calculateAvailability,
  availabilityPolicy,
} from '../../../salon-management/public.js';
import { busyByStaff } from '../../../salon-management/persistence-contract.js';
import type { AvailabilityQuery } from '../../../salon-management/public.js';
import { BookingChangesStore } from '../../application/booking-changes-store.js';
import { BookingStore } from '../../application/booking-store.js';
import {
  ensureCustomerChange,
  ensureReplacementTime,
  CUSTOMER_CHANGE_MINUTES,
} from '../../domain/booking-changes.js';
import type { RescheduleInput, BookingMoment } from '../../domain/booking-changes.js';
import type { BookingCommand } from '../../domain/booking.types.js';
import { ensureBookingWindow } from '../../domain/booking-policy.js';
import { chooseSlot } from '../../domain/choose-slot.js';
import { BookingTransaction } from './booking-transaction.js';
import { appointment } from './appointment-query.js';
import { readChangeAppointment, readChanges } from './booking-change-query.js';
import { cancelLockedBooking } from './cancel-booking.js';
import { reschedulingSchedule } from './rescheduling-schedule.js';
@Injectable()
export class PostgresBookingChanges extends BookingChangesStore {
  constructor(
    private readonly database: DatabaseProvider,
    private readonly transaction: BookingTransaction,
    private readonly bookings: BookingStore,
    private readonly clock: Clock,
  ) {
    super();
  }
  async changes(actor: string, id: string, now: Date, business?: string) {
    const tx = await this.database.pool.connect();
    try {
      await tx.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const row = await readChangeAppointment(tx, actor, id, business);
      const result = await readChanges(tx, row, now);
      await tx.query('COMMIT');
      return result;
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }
  }
  async cancel(command: BookingCommand, id: string, reason: string, version: number, now: Date) {
    const before = await readChangeAppointment(this.database.pool, command.actor, id);
    const target = await this.transaction.run(
      command,
      before.business_id,
      async (tx) => {
        const row = await readChangeAppointment(tx, command.actor, id, undefined, true);
        const checkedAt = new Date(Math.max(now.getTime(), this.clock.now().getTime()));
        ensureCustomerChange(appointment(row), checkedAt, version);
        await cancelLockedBooking(tx, row, command.actor, reason, checkedAt);
        return id;
      },
      id,
    );
    return this.bookings.get(command.actor, target);
  }
  async reschedule(
    command: BookingCommand,
    id: string,
    input: RescheduleInput,
    version: number,
    now: Date,
  ) {
    const before = await readChangeAppointment(this.database.pool, command.actor, id);
    const target = await this.transaction.run(
      command,
      before.business_id,
      async (tx) => {
        const row = await readChangeAppointment(tx, command.actor, id, undefined, true);
        const checkedAt = new Date(Math.max(now.getTime(), this.clock.now().getTime()));
        ensureCustomerChange(appointment(row), checkedAt, version);
        ensureBookingWindow(input.starts_at, checkedAt);
        ensureReplacementTime(input.starts_at, checkedAt);
        const date = localDate(new Date(input.starts_at));
        const schedule = await reschedulingSchedule(tx, row, {
          staff_id: input.staff_id,
          from: date,
          to: date,
        });
        const s = row.snapshot;
        const staffId = chooseSlot(
          schedule,
          {
            ...input,
            business_id: row.business_id,
            service_id: row.service_id,
            expected_price_irr: s.price_irr,
            expected_duration_minutes: s.duration_minutes,
            customer_name: s.customer_name,
            customer_mobile: s.customer_mobile,
            notice_override_reason: null,
          },
          checkedAt,
          busyByStaff(schedule),
          false,
        );
        if (row.starts_at.toISOString() === input.starts_at && row.staff_id === staffId)
          conflict('UNCHANGED_APPOINTMENT', 'زمان یا متخصص تازه‌ای انتخاب کنید.');
        const staff = schedule.staff.find((st) => st.id === staffId) ?? notFound();
        const start = new Date(input.starts_at),
          end = new Date(start.getTime() + s.duration_minutes * MINUTE_MS);
        const oldMoment: BookingMoment = {
          starts_at: row.starts_at.toISOString(),
          ends_at: row.ends_at.toISOString(),
          staff_id: row.staff_id,
          staff_name: s.staff_name,
        };
        const newMoment: BookingMoment = {
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          staff_id: staffId,
          staff_name: staff.name,
        };
        // The immutable event is inserted first so the BEFORE trigger can verify its precise before/after.
        await tx.query(
          "INSERT INTO app.booking_events(appointment_id,version,actor_id,action,details) VALUES($1,$2,$3,'rescheduled',$4::jsonb)",
          [
            id,
            row.version + 1,
            command.actor,
            JSON.stringify({ before: oldMoment, after: newMoment }),
          ],
        );
        await tx.query(
          "UPDATE app.appointments SET starts_at=$2,ends_at=$3,staff_id=$4,snapshot=jsonb_set(snapshot,'{staff_name}',to_jsonb($5::text)),version=version+1 WHERE id=$1",
          [id, start, end, staffId, staff.name],
        );
        await tx.query(
          'UPDATE app.schedule_allocations SET staff_id=$2,occupied_start=$3,occupied_end=$4 WHERE appointment_id=$1',
          [
            id,
            staffId,
            new Date(start.getTime() - s.buffer_before_minutes * MINUTE_MS),
            new Date(end.getTime() + s.buffer_after_minutes * MINUTE_MS),
          ],
        );
        return id;
      },
      id,
    );
    return this.bookings.get(command.actor, target);
  }
  async options(
    actor: string,
    id: string,
    query: Omit<AvailabilityQuery, 'service_id'>,
    now: Date,
  ) {
    const tx = await this.database.pool.connect();
    try {
      await tx.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const row = await readChangeAppointment(tx, actor, id);
      ensureCustomerChange(appointment(row), now);
      const schedule = await reschedulingSchedule(tx, row, query, true);
      if (query.staff_id !== 'any' && !schedule.staff.some((s) => s.id === query.staff_id))
        notFound();
      const { id: serviceId, name, price_irr, duration_minutes } = schedule.service;
      const days = calculateAvailability(
        schedule,
        { ...query, service_id: row.service_id },
        now,
        busyByStaff(schedule),
        CUSTOMER_CHANGE_MINUTES,
      );
      await tx.query('COMMIT');
      return {
        ...query,
        service_id: row.service_id,
        business_id: row.business_id,
        appointment_version: row.version,
        staff: schedule.staff.map((s) => ({ id: s.id, name: s.name })),
        service: { id: serviceId, name, price_irr, duration_minutes },
        timezone: schedule.timezone,
        checked_at: now.toISOString(),
        availability_basis: 'live_occupancy' as const,
        booking_enabled: true as const,
        policy: { ...availabilityPolicy(now), minimum_notice_minutes: 120 as const },
        days,
      };
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }
  }
}
