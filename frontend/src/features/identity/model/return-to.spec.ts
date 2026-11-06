import { it, expect } from 'vitest';
import { safeReturnTo } from './return-to';
it('preserves a complete booking selection and rejects external or malformed returns', () => {
  const id = '3e70e632-9975-4371-9022-9bfbc5c698c5';
  const path =
    `/salons/${id}/book?` +
    new URLSearchParams({ service_id: id, staff_id: 'any', starts_at: '2026-11-03T07:00:00.000Z' });
  expect(safeReturnTo(path)).toBe(path);
  expect(safeReturnTo('/appointments')).toBe('/appointments');
  expect(safeReturnTo(`/appointments/${id}/reschedule`)).toBe(`/appointments/${id}/reschedule`);
  for (const bad of [
    '//evil.com',
    'https://evil.com',
    '/\\evil.com',
    '/salons/' + id + '/book',
    '/account?returnTo=//evil.com',
    path + '&service_id=' + id,
    path + '&customer_mobile=09123456789',
  ])
    expect(safeReturnTo(bad)).toBe('/account');
});
