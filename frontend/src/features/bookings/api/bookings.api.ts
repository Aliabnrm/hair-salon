import { apiRequest, HttpFailure } from '../../../lib/api/http-client';
import { decodeAppointment, decodeBookingPage } from '../model/booking-values';
import type { BookingInput } from '../model/booking.types';
import { decodeAvailability } from '../../availability';
const base = (business?: string) =>
  business ? `/api/v1/businesses/${business}/appointments` : '/api/v1/appointments';
export async function getAppointment(id: string, signal: AbortSignal, business?: string) {
  const a = decodeAppointment(await apiRequest(base(business) + '/' + id, { signal }));
  if (a.id !== id || (business && a.business_id !== business))
    throw new Error('شناسه نوبت ناسازگار است.');
  return a;
}
export async function appointmentPage(
  query: URLSearchParams,
  signal: AbortSignal,
  business?: string,
) {
  return decodeBookingPage(
    await apiRequest((business ? base(business) : '/api/v1/me/appointments') + '?' + query, {
      signal,
    }),
  );
}
export async function createAppointment(
  input: BookingInput,
  key: string,
  signal: AbortSignal,
  manual = false,
) {
  const a = decodeAppointment(
    await apiRequest(base(manual ? input.business_id : undefined), {
      method: 'POST',
      body: input,
      idempotencyKey: key,
      signal,
    }),
  );
  if (
    a.business_id !== input.business_id ||
    a.service_id !== input.service_id ||
    a.starts_at !== input.starts_at ||
    (input.staff_id !== 'any' && a.staff_id !== input.staff_id) ||
    a.source !== (manual ? 'manual' : 'online')
  )
    throw new HttpFailure(502, 'INVALID_RESPONSE');
  return a;
}
export async function cancelAppointment(
  business: string,
  id: string,
  reason: string,
  version: number,
  key: string,
  signal: AbortSignal,
) {
  return decodeAppointment(
    await apiRequest(base(business) + '/' + id + '/cancellation', {
      method: 'POST',
      body: { reason },
      version,
      idempotencyKey: key,
      signal,
    }),
  );
}
export async function resolveIntent(
  key: string,
  operation: 'online' | 'manual' | 'cancel',
  signal: AbortSignal,
) {
  return decodeAppointment(
    await apiRequest('/api/v1/me/booking-intents/' + key + '?operation=' + operation, { signal }),
  );
}
export async function manualOptions(
  business: string,
  service: string,
  staff: string,
  date: string | undefined,
  signal: AbortSignal,
) {
  return decodeAvailability(
    await apiRequest(
      `/api/v1/businesses/${business}/booking-options?${new URLSearchParams({ service_id: service, staff_id: staff, ...(date ? { from: date, to: date } : {}) })}`,
      { signal },
    ),
  );
}
