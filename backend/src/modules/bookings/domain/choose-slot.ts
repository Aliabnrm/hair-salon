import { conflict } from '../../../common/domain/capability-error.js';
import { calculateAvailability, localDate, MINUTE_MS } from '../../salon-management/public.js';
import type { AvailabilitySnapshot, TimeRange } from '../../salon-management/public.js';
import type { CreateBooking } from './booking.types.js';
export function chooseSlot(
  snapshot: AvailabilitySnapshot,
  input: CreateBooking,
  now: Date,
  busy: ReadonlyMap<string, TimeRange[]>,
  manual: boolean,
): string {
  if (
    snapshot.service.price_irr !== input.expected_price_irr ||
    snapshot.service.duration_minutes !== input.expected_duration_minutes
  )
    conflict(
      'SERVICE_CHANGED',
      'مبلغ یا مدت خدمت تغییر کرده است؛ خلاصه تازه را بررسی و دوباره تأیید کنید.',
    );
  const start = Date.parse(input.starts_at);
  if (start <= now.getTime())
    conflict('SLOT_UNAVAILABLE', 'زمان انتخاب‌شده گذشته است؛ زمان دیگری انتخاب کنید.');
  if (manual && start < now.getTime() + 60 * MINUTE_MS && !input.notice_override_reason)
    conflict(
      'NOTICE_REASON_REQUIRED',
      'برای ثبت در کمتر از یک ساعت، دلیل استثنای فاصله زمانی لازم است.',
    );
  const date = localDate(new Date(start));
  for (const st of snapshot.staff.toSorted((a, b) => a.id.localeCompare(b.id))) {
    const days = calculateAvailability(
      snapshot,
      { service_id: input.service_id, staff_id: st.id, from: date, to: date },
      now,
      busy,
      manual && input.notice_override_reason ? 0 : 60,
    );
    if (days[0]?.slots.some((s) => s.starts_at === input.starts_at)) return st.id;
  }
  return conflict('SLOT_UNAVAILABLE', 'این زمان دیگر آزاد نیست؛ زمان دیگری انتخاب کنید.');
}
