import type { Pool, PoolClient } from 'pg';
import { notFound } from '../../../../common/domain/capability-error.js';
import { canCustomerChange, customerChangeDeadline } from '../../domain/booking-changes.js';
import type { BookingChanges, BookingChangeEvent } from '../../domain/booking-changes.js';
import { appointment, appointmentColumns, type AppointmentRow } from './appointment-query.js';
import { requireOwner } from './booking-transaction.js';
export async function readChangeAppointment(
  db: Pool | PoolClient,
  actor: string,
  id: string,
  business?: string,
  lock = false,
): Promise<AppointmentRow> {
  if (business) await requireOwner(db, actor, business);
  const r = await db.query<AppointmentRow>(
    `SELECT ${appointmentColumns} FROM app.appointments a WHERE a.id=$1 AND ${business ? 'a.business_id=$2' : "a.booking_user_id=$2 AND a.source='online'"}${lock ? ' FOR UPDATE' : ''}`,
    [id, business ?? actor],
  );
  return r.rows[0] ?? notFound();
}
export async function readChanges(
  db: PoolClient,
  row: AppointmentRow,
  now: Date,
): Promise<BookingChanges> {
  const r = await db.query<BookingChangeEvent>(
    `SELECT e.version,e.action,CASE WHEN e.actor_id=a.booking_user_id THEN 'customer' ELSE 'owner' END AS actor,e.reason,
    e.occurred_at::text AS occurred_at,e.details->'before' AS before,e.details->'after' AS after
    FROM app.booking_events e JOIN app.appointments a ON a.id=e.appointment_id WHERE e.appointment_id=$1 ORDER BY e.version DESC LIMIT 51`,
    [row.id],
  );
  return {
    appointment: appointment(row),
    appointment_id: row.id,
    appointment_version: row.version,
    checked_at: now.toISOString(),
    change_deadline: customerChangeDeadline(row.starts_at.toISOString()),
    customer_can_change: canCustomerChange(appointment(row), now),
    items: r.rows
      .slice(0, 50)
      .map((e) => ({ ...e, occurred_at: new Date(e.occurred_at).toISOString() })),
    has_more: r.rows.length > 50,
  };
}
