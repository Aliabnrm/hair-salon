import { it, expect } from 'vitest';
import { decodeAvailability } from './availability.api';
const response = {
  business_id: 'd04d67b8-98f5-4cd1-a812-f6bef357b8b4',
  service_id: '3f056af1-99e0-46f4-ab67-8b8b1815dede',
  service: {
    id: '3f056af1-99e0-46f4-ab67-8b8b1815dede',
    name: 'خدمت',
    price_irr: 0,
    duration_minutes: 17,
  },
  staff_id: 'any',
  timezone: 'Asia/Tehran',
  checked_at: '2026-11-03T00:00:00.000Z',
  availability_basis: 'schedule_only',
  booking_enabled: false,
  policy: {
    slot_step_minutes: 15,
    minimum_notice_minutes: 60,
    first_allowed_date: '2026-11-03',
    last_allowed_date: '2026-12-02',
  },
  from: '2026-11-03',
  to: '2026-11-03',
  days: [
    {
      local_date: '2026-11-03',
      slots: [
        {
          starts_at: '2026-11-03T06:45:00.000Z',
          ends_at: '2026-11-03T07:02:00.000Z',
          start_local: '10:15',
          end_local: '10:32',
          available_staff_count: 2,
        },
      ],
    },
  ],
};
it('preserves zero price and rejects invalid semantics, time ranges and staff counts', () => {
  expect(decodeAvailability(response).service.price_irr).toBe(0);
  for (const patch of [
    { booking_enabled: true },
    { availability_basis: 'bookable' },
    { timezone: 'UTC' },
    { days: [] },
    { days: [{ local_date: '2026-02-30', slots: [] }] },
    {
      days: [
        {
          local_date: '2026-11-03',
          slots: [{ ...response.days[0]?.slots[0], available_staff_count: 0 }],
        },
      ],
    },
  ])
    expect(() => decodeAvailability({ ...response, ...patch })).toThrow();
});
