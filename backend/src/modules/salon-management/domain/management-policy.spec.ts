import { describe, expect, it } from 'vitest';
import { businessInput } from './business-policy.js';
import { serviceInput } from './service-policy.js';
import { exceptionInput, weekly, intersectIntervals } from './schedule-policy.js';
const service = {
  name: 'کوتاهی مو',
  price_irr: 2500000,
  duration_minutes: 45,
  buffer_before_minutes: 0,
  buffer_after_minutes: 10,
};
describe('management domain invariants', () => {
  it('normalizes an Iranian mobile without claiming ownership', () => {
    expect(
      businessInput({
        name: ' آرایشگاه ',
        audience: 'women',
        city: 'تهران',
        public_phone: '09121234567',
      }),
    ).toMatchObject({
      name: 'آرایشگاه',
      public_phone: '+989121234567',
      public_address: null,
    });
  });
  it.each([-1, 2, 10.5, 10000000010, Number.MAX_SAFE_INTEGER])('rejects invalid IRR %s', (price) =>
    expect(() => serviceInput({ ...service, price_irr: price })).toThrow(),
  );
  it('rejects role mass assignment and invalid duration', () => {
    expect(() =>
      businessInput({
        name: 'آراسته',
        city: 'تهران',
        audience: 'men',
        role: 'owner',
      }),
    ).toThrow();
    expect(() => serviceInput({ ...service, duration_minutes: 0 })).toThrow();
  });
  it('accepts adjacent local intervals and end-of-day but rejects overlap, overnight and a fifth interval', () => {
    expect(
      weekly({
        intervals: [
          { weekday: 0, start_local: '12:00', end_local: '24:00' },
          { weekday: 0, start_local: '09:00', end_local: '12:00' },
        ],
      }),
    ).toHaveLength(2);
    for (const intervals of [
      [{ weekday: 0, start_local: '20:00', end_local: '02:00' }],
      Array.from({ length: 5 }, () => ({
        weekday: 0,
        start_local: '09:00',
        end_local: '10:00',
      })),
      [
        { weekday: 0, start_local: '09:00', end_local: '13:00' },
        { weekday: 0, start_local: '12:00', end_local: '14:00' },
      ],
    ])
      expect(() => weekly({ intervals })).toThrow();
  });
  it('requires a real Gregorian date and a consistent closed override', () => {
    expect(() =>
      exceptionInput({
        local_date: '2026-02-30',
        staff_id: null,
        closed: true,
        intervals: [],
      }),
    ).toThrow();
    expect(() =>
      exceptionInput({
        local_date: '2026-11-01',
        staff_id: null,
        closed: false,
        intervals: [],
      }),
    ).toThrow();
    expect(
      exceptionInput({
        local_date: '2026-11-01',
        staff_id: null,
        closed: true,
        intervals: [],
      }),
    ).toMatchObject({ closed: true });
  });
  it('a closed salon wins over staff opening intervals', () => {
    expect(intersectIntervals([], [{ start_local: '09:00', end_local: '18:00' }])).toEqual([]);
    expect(
      intersectIntervals(
        [{ start_local: '10:00', end_local: '12:00' }],
        [{ start_local: '09:00', end_local: '11:00' }],
      ),
    ).toEqual([{ start_local: '10:00', end_local: '11:00' }]);
  });
});
