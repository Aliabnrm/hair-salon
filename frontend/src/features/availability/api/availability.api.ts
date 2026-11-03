import { apiRequest, HttpFailure } from '../../../lib/api/http-client';
import { record, string, number, array } from '../../../lib/api/response-values';
import { validLocalDate, inDays } from '../../../lib/format/local-date';
import { isUuid } from '../../../lib/format/identifier';
import type { Availability, AvailabilitySlot } from '../model/availability.types';

function fail(): never {
  throw new HttpFailure(502, 'INVALID_RESPONSE');
}
const isoDate = (v: unknown) => {
  const s = string(v);
  return validLocalDate(s) ? s : fail();
};
const instant = (v: unknown) => {
  const s = string(v);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString() === s
    ? s
    : fail();
};
const positive = (v: unknown, max: number) => {
  const n = number(v);
  return n >= 1 && n <= max ? n : fail();
};
function slot(v: unknown): AvailabilitySlot {
  const p = record(v),
    starts_at = instant(p.starts_at),
    ends_at = instant(p.ends_at);
  const start_local = string(p.start_local),
    end_local = string(p.end_local);
  if (
    starts_at >= ends_at ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start_local) ||
    !/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/.test(end_local)
  )
    fail();
  return {
    starts_at,
    ends_at,
    start_local,
    end_local,
    available_staff_count: positive(p.available_staff_count, 50),
  };
}
export function decodeAvailability(v: unknown): Availability {
  const p = record(v),
    s = record(p.service),
    policy = record(p.policy);
  if (
    p.timezone !== 'Asia/Tehran' ||
    p.availability_basis !== 'schedule_only' ||
    p.booking_enabled !== false ||
    policy.slot_step_minutes !== 15 ||
    policy.minimum_notice_minutes !== 60
  )
    fail();
  const price_irr = number(s.price_irr);
  if (price_irr < 0 || price_irr > 10000000000) fail();
  const days = array(p.days, (v) => {
    const d = record(v),
      slots = array(d.slots, slot);
    if (new Set(slots.map((s) => s.starts_at)).size !== slots.length) fail();
    return { local_date: isoDate(d.local_date), slots };
  });
  if (days.length < 1 || days.length > 7 || days.reduce((n, d) => n + d.slots.length, 0) > 700)
    fail();
  const from = isoDate(p.from),
    to = isoDate(p.to);
  const first = isoDate(policy.first_allowed_date),
    last = isoDate(policy.last_allowed_date);
  const business = string(p.business_id),
    service = string(p.service_id),
    staff = string(p.staff_id);
  if (
    !isUuid(business) ||
    !isUuid(service) ||
    service !== s.id ||
    (staff !== 'any' && !isUuid(staff)) ||
    last !== inDays(first, 29) ||
    from < first ||
    to > last ||
    to !== inDays(from, days.length - 1) ||
    days.some(
      (d, i) =>
        d.local_date !== inDays(from, i) ||
        d.slots.some((slot, j) => j > 0 && (d.slots[j - 1]?.starts_at ?? '') >= slot.starts_at),
    )
  )
    fail();
  return {
    business_id: business,
    service_id: service,
    service: {
      id: string(s.id),
      name: string(s.name),
      price_irr,
      duration_minutes: positive(s.duration_minutes, 720),
    },
    staff_id: staff,
    timezone: p.timezone,
    checked_at: instant(p.checked_at),
    availability_basis: p.availability_basis,
    booking_enabled: p.booking_enabled,
    policy: {
      slot_step_minutes: 15,
      minimum_notice_minutes: 60,
      first_allowed_date: first,
      last_allowed_date: last,
    },
    from,
    to,
    days,
  };
}
export async function availability(
  business: string,
  service: string,
  staff: string,
  signal: AbortSignal,
  date?: string,
) {
  const q = new URLSearchParams({ service_id: service, staff_id: staff });
  if (date) {
    q.set('from', date);
    q.set('to', date);
  }
  const result = decodeAvailability(
    await apiRequest(`/api/v1/catalog/salons/${business}/availability?${q}`, { signal }),
  );
  if (
    result.business_id !== business ||
    result.service_id !== service ||
    result.service.id !== service ||
    result.staff_id !== staff ||
    (date && (result.from !== date || result.to !== date))
  )
    fail();
  return result;
}
