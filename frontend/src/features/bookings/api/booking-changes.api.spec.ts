import { afterEach, it, expect, vi } from 'vitest';
import { apiRequest } from '../../../lib/api/http-client';
import { decodeBookingChanges, getBookingChanges } from './booking-changes.api';
const id = '3e70e632-9975-4371-9022-9bfbc5c698c5',
  start = '2026-11-06T07:00:00.000Z';
function response() {
  const appointment = {
    id,
    business_id: id,
    service_id: id,
    staff_id: id,
    code: 'TRACKING',
    source: 'online',
    status: 'confirmed',
    version: 1,
    starts_at: start,
    ends_at: '2026-11-06T07:30:00.000Z',
    cancelled_at: null,
    cancellation_reason: null,
    snapshot: {
      business_name: 'سالن آزمون',
      business_address: null,
      business_phone: null,
      service_name: 'کوتاهی',
      staff_name: 'متخصص',
      price_irr: 2500000,
      duration_minutes: 30,
      buffer_before_minutes: 10,
      buffer_after_minutes: 5,
      service_version: 1,
      customer_name: 'مشتری آزمون',
      customer_mobile: '09123456789',
      timezone: 'Asia/Tehran',
      policy: 'سیاست آزمون',
    },
  };
  return {
    appointment,
    appointment_id: id,
    appointment_version: 1,
    checked_at: '2026-11-03T06:00:00.000Z',
    change_deadline: '2026-11-06T05:00:00.000Z',
    customer_can_change: true,
    has_more: false,
    items: [
      {
        version: 1,
        action: 'created',
        actor: 'customer',
        reason: null,
        occurred_at: '2026-11-03T06:00:00.000Z',
        before: null,
        after: null,
      },
    ],
  };
}
afterEach(() => vi.unstubAllGlobals());
it('decodes legacy history without inventing missing times and rejects inconsistent history or receipt versions', () => {
  const value = response();
  expect(decodeBookingChanges(value).items[0]?.after).toBeNull();
  expect(() => decodeBookingChanges({ ...value, appointment_version: 2 })).toThrow();
  expect(() =>
    decodeBookingChanges({ ...value, items: [{ ...value.items[0], action: 'rescheduled' }] }),
  ).toThrow();
  expect(() =>
    decodeBookingChanges({ ...value, items: [value.items[0], value.items[0]] }),
  ).toThrow();
  expect(() => decodeBookingChanges({ ...value, customer_can_change: 'true' })).toThrow();
});
it('allows only known customer/owner change routes and refuses arbitrary suffixes before sending a request', async () => {
  const fetcher = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ data: response() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetcher);
  const signal = new AbortController().signal;
  expect((await getBookingChanges(id, signal)).appointment.id).toBe(id);
  for (const path of [
    `/api/v1/appointments/${id}/rescheduling`,
    `/api/v1/appointments/${id}/rescheduling-options`,
    `/api/v1/appointments/${id}/cancellation`,
    `/api/v1/businesses/${id}/appointments/${id}/changes`,
  ])
    await apiRequest(path, { signal });
  const count = fetcher.mock.calls.length;
  await expect(apiRequest(`/api/v1/appointments/${id}/arbitrary`, { signal })).rejects.toThrow(
    'Unsupported API path',
  );
  expect(fetcher).toHaveBeenCalledTimes(count);
});
