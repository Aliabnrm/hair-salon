import type { Pool, PoolClient } from 'pg';
import { readSchedule } from '../../../salon-management/persistence-contract.js';
import type { AvailabilityQuery } from '../../../salon-management/public.js';
import type { AppointmentRow } from './appointment-query.js';
/** Use today's eligibility/hours but the appointment's agreed duration, price and buffers. */
export async function reschedulingSchedule(
  db: Pool | PoolClient,
  a: AppointmentRow,
  query: Omit<AvailabilityQuery, 'service_id'>,
  includeRoster = false,
) {
  const schedule = await readSchedule(
    db,
    a.business_id,
    { ...query, staff_id: includeRoster ? 'any' : query.staff_id, service_id: a.service_id },
    'public',
    a.id,
  );
  const s = a.snapshot;
  return {
    ...schedule,
    service: {
      ...schedule.service,
      name: s.service_name,
      price_irr: s.price_irr,
      duration_minutes: s.duration_minutes,
      buffer_before_minutes: s.buffer_before_minutes,
      buffer_after_minutes: s.buffer_after_minutes,
    },
  };
}
