import { apiRequest, HttpFailure } from '../../../lib/api/http-client';
import { record, string, number, boolean, array } from '../../../lib/api/response-values';
import { isUuid } from '../../../lib/format/identifier';
import { decodeAvailability } from '../../availability';
import { decodeAppointment } from '../model/booking-values';
import type { BookingChanges, BookingChangeEvent, BookingMoment } from '../model/booking-changes';
const fail = (): never => {
  throw new HttpFailure(502, 'INVALID_RESPONSE');
};
function instant(v: unknown) {
  const s = string(v);
  return Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s ? s : fail();
}
function moment(v: unknown): BookingMoment | null {
  if (v === null) return null;
  const m = record(v),
    staff = string(m.staff_id),
    start = instant(m.starts_at),
    end = instant(m.ends_at);
  if (!isUuid(staff) || end <= start) fail();
  return { starts_at: start, ends_at: end, staff_id: staff, staff_name: string(m.staff_name) };
}
export function decodeBookingChanges(v: unknown): BookingChanges {
  const p = record(v),
    a = decodeAppointment(p.appointment);
  if (p.appointment_id !== a.id || p.appointment_version !== a.version) fail();
  const items = array(p.items, (v): BookingChangeEvent => {
    const e = record(v),
      version = number(e.version);
    if (
      !['created', 'cancelled', 'rescheduled'].includes(string(e.action)) ||
      !['customer', 'owner'].includes(string(e.actor)) ||
      version < 1 ||
      version > a.version
    )
      fail();
    const before = moment(e.before),
      after = moment(e.after);
    if (e.action === 'rescheduled' && (!before || !after)) fail();
    return {
      version,
      action:
        e.action === 'rescheduled'
          ? 'rescheduled'
          : e.action === 'created'
            ? 'created'
            : 'cancelled',
      actor: e.actor === 'customer' ? 'customer' : 'owner',
      reason: e.reason === null ? null : string(e.reason),
      occurred_at: instant(e.occurred_at),
      before,
      after,
    };
  });
  if (items.length > 50 || items.some((e, i) => i > 0 && e.version >= (items[i - 1]?.version ?? 0)))
    fail();
  return {
    appointment: a,
    appointment_id: a.id,
    appointment_version: a.version,
    checked_at: instant(p.checked_at),
    change_deadline: instant(p.change_deadline),
    customer_can_change: boolean(p.customer_can_change),
    items,
    has_more: boolean(p.has_more),
  };
}
export async function getBookingChanges(id: string, signal: AbortSignal, business?: string) {
  const prefix = business ? `/api/v1/businesses/${business}/appointments` : '/api/v1/appointments';
  const result = decodeBookingChanges(await apiRequest(`${prefix}/${id}/changes`, { signal }));
  if (result.appointment_id !== id || (business && result.appointment.business_id !== business))
    fail();
  return result;
}
export async function cancelCustomerAppointment(
  id: string,
  reason: string,
  version: number,
  key: string,
  signal: AbortSignal,
) {
  const a = decodeAppointment(
    await apiRequest(`/api/v1/appointments/${id}/cancellation`, {
      method: 'POST',
      body: { reason },
      version,
      idempotencyKey: key,
      signal,
    }),
  );
  if (a.id !== id) fail();
  return a;
}
export async function rescheduleAppointment(
  id: string,
  input: { staff_id: string; starts_at: string },
  version: number,
  key: string,
  signal: AbortSignal,
) {
  const a = decodeAppointment(
    await apiRequest(`/api/v1/appointments/${id}/rescheduling`, {
      method: 'POST',
      body: input,
      version,
      idempotencyKey: key,
      signal,
    }),
  );
  if (a.id !== id) fail();
  return a;
}
export async function reschedulingOptions(
  id: string,
  staff: string,
  date: string | undefined,
  signal: AbortSignal,
) {
  const q = new URLSearchParams({ staff_id: staff, ...(date ? { from: date, to: date } : {}) });
  const raw = record(
    await apiRequest(`/api/v1/appointments/${id}/rescheduling-options?${q}`, { signal }),
  );
  const result = decodeAvailability(raw, 120),
    version = number(raw.appointment_version);
  if (
    version < 1 ||
    result.staff_id !== staff ||
    (date && (result.from !== date || result.to !== date))
  )
    fail();
  return {
    ...result,
    appointment_version: version,
    staff: array(raw.staff, (v) => {
      const s = record(v),
        id = string(s.id);
      if (!isUuid(id)) fail();
      return { id, name: string(s.name) };
    }),
  };
}
