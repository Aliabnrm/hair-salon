import type { PoolClient } from 'pg';
import type { AppointmentRow } from './appointment-query.js';
/** Caller has locked and authorized the appointment and checked its cancellation policy. */
export async function cancelLockedBooking(
  tx: PoolClient,
  a: AppointmentRow,
  actor: string,
  reason: string,
  now: Date,
): Promise<void> {
  await tx.query(
    "UPDATE app.appointments SET status='cancelled',version=version+1,cancelled_at=$2,cancellation_reason=$3 WHERE id=$1",
    [a.id, now, reason],
  );
  await tx.query('UPDATE app.schedule_allocations SET released_at=$2 WHERE appointment_id=$1', [
    a.id,
    now,
  ]);
  await tx.query(
    "INSERT INTO app.booking_events(appointment_id,version,actor_id,action,reason) VALUES($1,$2,$3,'cancelled',$4)",
    [a.id, a.version + 1, actor, reason],
  );
}
