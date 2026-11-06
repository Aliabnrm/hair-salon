import { availabilityPolicy, localDate } from '../../salon-management/public.js';
import { invalid, conflict } from '../../../common/domain/capability-error.js';
import { object, uuid, text, integer, isoDate } from '../../../common/domain/input.js';
import type { CreateBooking, BookingListQuery } from './booking.types.js';
export const BOOKING_POLICY =
  'نوبت قطعی؛ پرداخت در سالن. لغو و تغییر آنلاین تا دو ساعت پیش از شروع؛ پس از آن با سالن تماس بگیرید. موبایل تماس بدون تأیید پیامکی است.';
export function contactMobile(value: unknown, required: boolean): string | null {
  if (!required && (value === undefined || value === null || value === '')) return null;
  let mobile = text(value, 'customer_mobile', 11, 20)
    .replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
    .replace(/[ -]/g, '');
  if (mobile.startsWith('+98')) mobile = '0' + mobile.slice(3);
  if (!/^09\d{9}$/.test(mobile))
    invalid('customer_mobile', 'شماره موبایل ایران را مثل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.');
  return mobile;
}
export function createBooking(value: unknown, manual: boolean, business?: string): CreateBooking {
  const v = object(value, [
    'business_id',
    'service_id',
    'staff_id',
    'starts_at',
    'expected_price_irr',
    'expected_duration_minutes',
    'customer_name',
    'customer_mobile',
    ...(manual ? ['notice_override_reason'] : []),
  ]);
  const start = text(v.starts_at, 'starts_at', 20, 30);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?Z$/.test(start) ||
    !Number.isFinite(Date.parse(start))
  )
    invalid('starts_at');
  if (new Date(start).toISOString() !== start.replace(/:00Z$/, ':00.000Z')) invalid('starts_at');
  if (business && v.business_id !== undefined && v.business_id !== business) invalid('business_id');
  return {
    business_id: business ?? uuid(v.business_id, 'business_id'),
    service_id: uuid(v.service_id, 'service_id'),
    staff_id: v.staff_id === 'any' ? 'any' : uuid(v.staff_id, 'staff_id'),
    starts_at: new Date(start).toISOString(),
    expected_price_irr: integer(v.expected_price_irr, 'expected_price_irr', 0, 10000000000),
    expected_duration_minutes: integer(
      v.expected_duration_minutes,
      'expected_duration_minutes',
      1,
      720,
    ),
    customer_name: text(v.customer_name, 'customer_name', 2, 120),
    customer_mobile: contactMobile(v.customer_mobile, !manual),
    notice_override_reason:
      v.notice_override_reason === undefined || v.notice_override_reason === null
        ? null
        : text(v.notice_override_reason, 'notice_override_reason', 3, 300),
  };
}
export function cancellation(value: unknown): string {
  return text(object(value, ['reason']).reason, 'reason', 3, 300);
}
export function bookingListQuery(value: unknown, owner: boolean): BookingListQuery {
  const v = object(
    value,
    owner ? ['date', 'staff_id', 'limit', 'cursor'] : ['period', 'limit', 'cursor'],
  );
  const q: BookingListQuery = {
    limit:
      v.limit === undefined
        ? 20
        : integer(
            typeof v.limit === 'string' && /^\d+$/.test(v.limit) ? Number(v.limit) : v.limit,
            'limit',
            1,
            50,
          ),
  };
  if (owner) {
    q.date = isoDate(v.date, 'date');
    if (v.staff_id !== undefined && v.staff_id !== 'any') q.staff_id = uuid(v.staff_id, 'staff_id');
  } else {
    if (v.period !== undefined && v.period !== 'past' && v.period !== 'upcoming') invalid('period');
    q.period = v.period === 'past' ? 'past' : 'upcoming';
  }
  if (v.cursor !== undefined) q.cursor = uuid(v.cursor, 'cursor');
  return q;
}
export function ensureCancellable(
  status: string,
  start: Date,
  now: Date,
  version: number,
  expected: number,
) {
  if (status !== 'confirmed') conflict('ALREADY_CANCELLED', 'این نوبت قبلاً لغو شده است.');
  if (start.getTime() <= now.getTime())
    conflict('APPOINTMENT_STARTED', 'لغو فقط پیش از شروع نوبت ممکن است.');
  if (version !== expected)
    conflict('VERSION_CONFLICT', 'اطلاعات تغییر کرده است؛ دوباره صفحه را دریافت کنید.');
}

export function ensureCustomerCapacity(activeFutureCount: number): void {
  if (activeFutureCount >= 3)
    conflict(
      'CUSTOMER_BOOKING_LIMIT',
      'در هر سالن حداکثر سه نوبت آنلاین آینده می‌توانید داشته باشید.',
    );
}

export function ensureBookingWindow(startsAt: string, now: Date): void {
  const policy = availabilityPolicy(now),
    date = localDate(new Date(startsAt));
  if (date < policy.first_allowed_date || date > policy.last_allowed_date)
    invalid('starts_at', 'روز انتخاب‌شده در بازه سی روز مجاز نیست.');
}
