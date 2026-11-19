import { record, string, number, array } from '../../../lib/api/response-values';
import { HttpFailure } from '../../../lib/api/http-client';
import { isUuid } from '../../../lib/format/identifier';
import type { Appointment, BookingSelection } from './booking.types';
const fail = (): never => {
  throw new HttpFailure(502, 'INVALID_RESPONSE');
};
const nullable = (v: unknown) => (v === null ? null : string(v));
const id = (v: unknown) => {
  const s = string(v);
  return isUuid(s) ? s : fail();
};
const instant = (v: unknown) => {
  const s = string(v);
  return Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s ? s : fail();
};
const positive = (v: unknown) => {
  const n = number(v);
  return n > 0 ? n : fail();
};
export function decodeAppointment(v: unknown): Appointment {
  const a = record(v),
    s = record(a.snapshot);
  if (
    !['confirmed', 'cancelled', 'completed', 'no_show'].includes(string(a.status)) ||
    (a.source !== 'online' && a.source !== 'manual') ||
    s.timezone !== 'Asia/Tehran'
  )
    fail();
  const price = number(s.price_irr);
  if (price < 0 || price > 10000000000) fail();
  return {
    id: id(a.id),
    business_id: id(a.business_id),
    service_id: id(a.service_id),
    staff_id: id(a.staff_id),
    code: string(a.code),
    source: a.source === 'online' ? 'online' : 'manual',
    status:
      a.status === 'completed'
        ? 'completed'
        : a.status === 'no_show'
          ? 'no_show'
          : a.status === 'confirmed'
            ? 'confirmed'
            : 'cancelled',
    version: positive(a.version),
    starts_at: instant(a.starts_at),
    ends_at: instant(a.ends_at),
    cancellation_reason: nullable(a.cancellation_reason),
    cancelled_at: a.cancelled_at === null ? null : instant(a.cancelled_at),
    snapshot: {
      business_name: string(s.business_name),
      business_address: nullable(s.business_address),
      business_phone: nullable(s.business_phone),
      service_name: string(s.service_name),
      staff_name: string(s.staff_name),
      price_irr: price,
      duration_minutes: positive(s.duration_minutes),
      buffer_before_minutes: number(s.buffer_before_minutes),
      buffer_after_minutes: number(s.buffer_after_minutes),
      service_version: positive(s.service_version),
      customer_name: string(s.customer_name),
      customer_mobile: nullable(s.customer_mobile),
      timezone: 'Asia/Tehran',
      policy: string(s.policy),
    },
  };
}
export function decodeBookingPage(v: unknown) {
  const p = record(v);
  return {
    items: array(p.items, decodeAppointment),
    next_cursor: p.next_cursor === null ? null : id(p.next_cursor),
  };
}
export function readBookingSelection(params: URLSearchParams): BookingSelection | null {
  const s = params.get('service_id') ?? '',
    st = params.get('staff_id') ?? '',
    start = params.get('starts_at') ?? '';
  if (
    [...params.keys()].some(
      (k) => !['service_id', 'staff_id', 'starts_at'].includes(k) || params.getAll(k).length !== 1,
    ) ||
    !isUuid(s) ||
    (st !== 'any' && !isUuid(st)) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(start) ||
    !Number.isFinite(Date.parse(start))
  )
    return null;
  return { service_id: s, staff_id: st, starts_at: start };
}
export function tehranDate(instant = new Date().toISOString()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant));
}
export function appointmentTime(instant: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instant));
}
export function bookingMessage(error: unknown): string {
  return error instanceof HttpFailure
    ? error.message
    : 'ارتباط برقرار نشد. وضعیت درخواست را بررسی کنید و دوباره تلاش کنید.';
}
