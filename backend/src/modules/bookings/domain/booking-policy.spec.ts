import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { contactMobile, createBooking, ensureCancellable } from './booking-policy.js';
describe('booking contact and immutable intent policy', () => {
  it('normalizes Iranian digits and international prefix without claiming verified identity', () => {
    expect(contactMobile('۰۹۱۲۳۴۵۶۷۸۹', true)).toBe('09123456789');
    expect(contactMobile('+989123456789', true)).toBe('09123456789');
    expect(contactMobile('', false)).toBeNull();
    for (const bad of ['123', '+12025550123', '0912abc6789', '091234567890'])
      expect(() => contactMobile(bad, true)).toThrow();
  });
  it('rejects unknown privilege fields, invalid instants and online notice overrides', () => {
    const body = {
      business_id: randomUUID(),
      service_id: randomUUID(),
      staff_id: 'any',
      starts_at: '2026-11-03T07:00:00.000Z',
      expected_price_irr: 0,
      expected_duration_minutes: 17,
      customer_name: 'مراجعه کننده',
      customer_mobile: '09123456789',
    };
    expect(createBooking(body, false).customer_mobile).toBe('09123456789');
    expect(() => createBooking({ ...body, booking_user_id: randomUUID() }, false)).toThrow();
    expect(() => createBooking({ ...body, notice_override_reason: 'تماس' }, false)).toThrow();
    expect(() =>
      createBooking({ ...body, starts_at: '2026-11-31T07:00:00.000Z' }, false),
    ).toThrow();
  });
  it('allows cancellation only before start and against current version', () => {
    const now = new Date('2026-11-03T06:00Z'),
      start = new Date('2026-11-03T07:00Z');
    expect(() => ensureCancellable('confirmed', start, now, 1, 1)).not.toThrow();
    expect(() => ensureCancellable('confirmed', start, start, 1, 1)).toThrow();
    expect(() => ensureCancellable('confirmed', start, now, 2, 1)).toThrow();
    expect(() => ensureCancellable('cancelled', start, now, 2, 2)).toThrow();
  });
});
