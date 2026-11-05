import type { PoolClient } from 'pg';
import { conflict } from '../../../../common/domain/capability-error.js';
import { readSchedule } from '../../../salon-management/persistence-contract.js';
import { fitsWorkingHours, localDate } from '../../../salon-management/public.js';
interface Existing {
  service_id: string;
  staff_id: string;
  starts_at: Date;
  occupied_start: Date;
  occupied_end: Date;
}
export async function assertBookingCompatibility(
  tx: PoolClient,
  business: string,
  now: Date,
): Promise<void> {
  const r = await tx.query<Existing>(
    `SELECT a.service_id,a.staff_id,a.starts_at,l.occupied_start,l.occupied_end FROM app.appointments a JOIN app.schedule_allocations l ON l.appointment_id=a.id WHERE a.business_id=$1 AND a.status='confirmed' AND l.occupied_end>$2 ORDER BY a.starts_at`,
    [business, now],
  );
  if (!r.rows.length) return;
  const dates = r.rows.map((a) => localDate(a.starts_at)).sort();
  const first = dates[0],
    last = dates.at(-1);
  if (!first || !last) return;
  for (const service of new Set(r.rows.map((a) => a.service_id))) {
    const schedule = await readSchedule(
      tx,
      business,
      { service_id: service, staff_id: 'any', from: first, to: last },
      'existing',
    );
    for (const a of r.rows.filter((a) => a.service_id === service))
      if (
        !fitsWorkingHours(schedule, a.staff_id, localDate(a.starts_at), {
          start: a.occupied_start.getTime(),
          end: a.occupied_end.getTime(),
        })
      )
        conflict(
          'EXISTING_BOOKING_CONFLICT',
          'این تغییر با نوبت قطعی فعلی یا آینده ناسازگار است؛ ابتدا نوبت را هماهنگ و لغو کنید.',
        );
  }
}
