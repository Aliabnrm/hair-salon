import { describe, it, expect } from 'vitest';
import { calculateAvailability } from './availability-policy.js';
import { availabilityPolicy, availabilityQuery } from './availability-query.js';
import {
  addDays,
  startInstants,
  weekday,
  normalizeRanges,
  dayBoundary,
  MINUTE_MS,
} from './time-range.js';
import type { AvailabilitySnapshot, AvailabilityQuery, TimeRange } from './availability.types.js';

const date = '2026-11-07'; // Saturday
const now = new Date('2026-11-06T00:00:00Z');
function fixture(): AvailabilitySnapshot {
  const hours = [{ weekday: 0, start_local: '10:00', end_local: '12:00' }];
  return {
    business_id: 'salon',
    timezone: 'Asia/Tehran',
    service: {
      id: 'service',
      name: 'کوتاهی',
      price_irr: 0,
      duration_minutes: 30,
      buffer_before_minutes: 10,
      buffer_after_minutes: 5,
    },
    hours,
    staff: [
      { id: 'a', hours },
      { id: 'b', hours },
    ],
    exceptions: [],
  };
}
const query: AvailabilityQuery = { service_id: 'service', staff_id: 'any', from: date, to: date };
const at = (time: string, localDate = date) => new Date(`${localDate}T${time}:00+03:30`).getTime();
function slots(s = fixture(), busy = new Map<string, TimeRange[]>(), time = now, q = query) {
  return calculateAvailability(s, q, time, busy)[0]?.slots ?? [];
}
describe('schedule-only availability invariants', () => {
  it('fits both buffers and service on the local 15-minute grid; any deduplicates and counts', () => {
    const result = slots();
    expect(result.map((x) => x.start_local)).toEqual(['10:15', '10:30', '10:45', '11:00', '11:15']);
    expect(result.every((s) => s.available_staff_count === 2)).toBe(true);
    expect(result[0]?.ends_at).toBe('2026-11-07T07:15:00.000Z');
    expect(
      slots(fixture(), new Map(), now, { ...query, staff_id: 'a' }).every(
        (s) => s.available_staff_count === 1,
      ),
    ).toBe(true);
  });
  it('does not bridge breaks, but merges adjacent continuous intervals before intersecting', () => {
    const s = fixture();
    s.hours = [
      { weekday: 0, start_local: '10:00', end_local: '10:20' },
      { weekday: 0, start_local: '10:30', end_local: '10:50' },
    ];
    expect(slots(s)).toEqual([]);
    s.hours[1] = { weekday: 0, start_local: '10:20', end_local: '11:00' };
    expect(slots(s).map((s) => s.start_local)).toEqual(['10:15']);
  });
  it('aligns starts with midnight, supports non-grid durations and exact ending boundaries', () => {
    const s = fixture();
    s.hours = [{ weekday: 0, start_local: '10:10', end_local: '11:02' }];
    s.service = {
      ...s.service,
      duration_minutes: 17,
      buffer_before_minutes: 0,
      buffer_after_minutes: 0,
    };
    expect(slots(s).map((s) => [s.start_local, s.end_local])).toEqual([
      ['10:15', '10:32'],
      ['10:30', '10:47'],
      ['10:45', '11:02'],
    ]);
  });
  it('uses an exact 60-minute notice boundary without rounding server time', () => {
    const exact = new Date(at('09:15'));
    expect(slots(fixture(), new Map(), exact)[0]?.start_local).toBe('10:15');
    expect(slots(fixture(), new Map(), new Date(exact.getTime() + 1))[0]?.start_local).toBe(
      '10:30',
    );
  });
  it('replaces weekly scope with open/closed overrides; salon closure wins', () => {
    const s = fixture();
    s.exceptions = [{ local_date: date, staff_id: 'a', closed: true, intervals: [] }];
    expect(slots(s).every((x) => x.available_staff_count === 1)).toBe(true);
    s.exceptions.push({ local_date: date, staff_id: null, closed: true, intervals: [] });
    expect(slots(s)).toEqual([]);
    s.hours = [];
    s.staff.forEach((st) => {
      st.hours = [];
    });
    s.exceptions = [
      {
        local_date: date,
        staff_id: null,
        closed: false,
        intervals: [{ start_local: '10:00', end_local: '11:00' }],
      },
      {
        local_date: date,
        staff_id: 'a',
        closed: false,
        intervals: [{ start_local: '10:00', end_local: '12:00' }],
      },
    ];
    expect(slots(s).map((s) => s.start_local)).toEqual(['10:15']);
  });
  it('keeps empty days, and empty schedules are closed', () => {
    const s = fixture();
    s.hours = [];
    expect(calculateAvailability(s, { ...query, to: addDays(date, 1) }, now, new Map())).toEqual([
      { local_date: date, slots: [] },
      { local_date: addDays(date, 1), slots: [] },
    ]);
  });
  it('subtracts existing occupied ranges once, respecting half-open boundary contact', () => {
    const s = fixture();
    const busy = new Map([
      [
        'a',
        [
          { start: at('10:50'), end: at('11:00') },
          { start: at('10:55'), end: at('11:05') },
        ],
      ],
      ['b', [{ start: at('00:00') - 1000, end: at('23:59') + 1000 }]],
    ]);
    expect(slots(s, busy).map((s) => s.start_local)).toEqual(['10:15', '11:15']);
    expect(slots(s, busy).every((s) => s.available_staff_count === 1)).toBe(true);
    busy.set('a', [{ start: at('10:00'), end: at('12:00') }]);
    expect(slots(s, busy)).toEqual([]);
    expect(
      normalizeRanges([
        { start: 2, end: 4 },
        { start: 1, end: 2 },
        { start: 2, end: 3 },
        { start: 9, end: 9 },
      ]),
    ).toEqual([{ start: 1, end: 4 }]);
  });
  it('allows an exact 24:00 end and rejects cross-day occupied time', () => {
    const s = fixture();
    const hours = [{ weekday: 0, start_local: '23:00', end_local: '24:00' }];
    s.hours = hours;
    s.staff.forEach((st) => {
      st.hours = hours;
    });
    s.service = { ...s.service, buffer_before_minutes: 0, buffer_after_minutes: 0 };
    expect(slots(s).at(-1)?.end_local).toBe('24:00');
    expect(slots(s).at(-1)?.start_local).toBe('23:30');
    s.service.buffer_after_minutes = 1;
    expect(slots(s).at(-1)?.start_local).toBe('23:15');
  });
  it('is invariant under input row ordering', () => {
    const s = fixture(),
      expected = slots(s);
    s.staff.reverse();
    s.hours.reverse();
    s.exceptions.reverse();
    expect(slots(s)).toEqual(expected);
  });
  it('distinguishes historical folds and skips gaps without a fixed UTC offset', () => {
    expect(startInstants('2021-03-22', 15)).toEqual([]);
    const fold = startInstants('2021-09-21', 23 * 60 + 15);
    expect(fold).toHaveLength(2);
    expect((fold[1] ?? 0) - (fold[0] ?? 0)).toBe(60 * MINUTE_MS);
    const s = fixture(),
      historic = '2021-09-21';
    const hours = [{ weekday: weekday(historic), start_local: '23:00', end_local: '24:00' }];
    s.hours = hours;
    s.staff = [{ id: 'a', hours }];
    s.service = { ...s.service, buffer_before_minutes: 0, buffer_after_minutes: 0 };
    const result = slots(s, new Map(), new Date('2021-09-20T00:00Z'), {
      ...query,
      from: historic,
      to: historic,
    });
    expect(result.filter((x) => x.start_local === '23:15')).toHaveLength(2);
    expect(new Set(result.map((x) => x.starts_at)).size).toBe(result.length);
    s.hours = [
      { ...hours[0], weekday: weekday(historic), start_local: '23:00', end_local: '23:30' },
    ];
    s.staff = [{ id: 'a', hours: s.hours }];
    const partial = slots(s, new Map(), new Date('2021-09-20T00:00Z'), {
      ...query,
      from: historic,
      to: historic,
    });
    expect(partial.map((s) => s.start_local)).toEqual(['23:00', '23:00']);
    expect(partial.every((s) => s.end_local === '23:30')).toBe(true);
    expect(dayBoundary('2021-03-22', 0)).toBe(startInstants('2021-03-22', 60)[0]);
  });
});
describe('server date horizon and query bounds', () => {
  const service_id = 'b98c9f16-7a44-4634-9911-328208f909b8';
  const policy = availabilityPolicy(new Date('2026-11-03T20:31:00Z'));
  it('uses Tehran calendar dates at midnight and an inclusive 30-day horizon', () => {
    expect(policy.first_allowed_date).toBe('2026-11-04');
    expect(policy.last_allowed_date).toBe('2026-12-03');
    expect(weekday(date)).toBe(0);
    expect(availabilityQuery({ service_id }, policy)).toEqual({
      service_id,
      staff_id: 'any',
      from: '2026-11-04',
      to: '2026-11-10',
    });
    expect(
      availabilityQuery(
        { service_id, from: policy.last_allowed_date, to: policy.last_allowed_date },
        policy,
      ).to,
    ).toBe(policy.last_allowed_date);
  });
  it.each([
    { from: '2026-11-03', to: '2026-11-04' },
    { from: '2026-11-04', to: '2026-11-11' },
    { from: '2026-12-04', to: '2026-12-04' },
    { from: '2026-11-05', to: '2026-11-04' },
    { from: '2026-11-04' },
    { to: '2026-11-04' },
    { from: '2026-11-31', to: '2026-11-31' },
    { timezone: 'UTC' },
    { duration: 1 },
    { staff_id: ['any', 'any'] },
    { service_id: [service_id] },
  ])('rejects invalid or injected query %j', (q) => {
    expect(() => availabilityQuery({ service_id, ...q }, policy)).toThrow();
  });
});
