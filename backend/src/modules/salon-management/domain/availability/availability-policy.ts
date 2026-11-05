import { CapabilityError } from '../../../../common/domain/capability-error.js';
import { clock, minute, intersectIntervals } from '../schedule-policy.js';
import type { Interval, WeeklyInterval } from '../management.types.js';
import { availabilityLimits } from './availability.types.js';
import type {
  AvailabilitySnapshot,
  AvailabilityQuery,
  AvailabilitySlot,
  DayOverride,
  TimeRange,
} from './availability.types.js';
import {
  addDays,
  dayBoundary,
  startInstants,
  localClock,
  weekday,
  normalizeRanges,
  overlaps,
  MINUTE_MS,
  daySegments,
  instantRanges,
} from './time-range.js';

function effectiveHours(
  hours: WeeklyInterval[],
  exceptions: DayOverride[],
  date: string,
  staff: string | null,
): Interval[] {
  const override = exceptions.find((e) => e.local_date === date && e.staff_id === staff);
  const effective = override
    ? override.closed
      ? []
      : override.intervals
    : hours.filter((h) => h.weekday === weekday(date));
  return normalizeRanges(
    effective.map((h) => ({ start: minute(h.start_local), end: minute(h.end_local, true) })),
  ).map((r) => ({ start_local: clock(r.start), end_local: clock(r.end) }));
}
/** Pure schedule calculation; the caller supplies a consistent occupancy snapshot. */
export function calculateAvailability(
  snapshot: AvailabilitySnapshot,
  query: AvailabilityQuery,
  now: Date,
  busyByStaff: ReadonlyMap<string, TimeRange[]>,
  minimumNoticeMinutes: number = availabilityLimits.minimumNoticeMinutes,
): { local_date: string; slots: AvailabilitySlot[] }[] {
  const service = snapshot.service;
  const earliest = now.getTime() + minimumNoticeMinutes * MINUTE_MS;
  const days: { local_date: string; slots: AvailabilitySlot[] }[] = [];
  let total = 0;
  for (let date = query.from; date <= query.to; date = addDays(date, 1)) {
    const salon = effectiveHours(snapshot.hours, snapshot.exceptions, date, null);
    const dayStart = dayBoundary(date, 0),
      dayEnd = dayBoundary(date, 1440, true);
    const segments = daySegments(date);
    const grid = Array.from(
      { length: 1440 / availabilityLimits.slotStepMinutes },
      (_, i) => i * availabilityLimits.slotStepMinutes,
    ).flatMap((m) =>
      startInstants(date, m)
        .filter((at) => at >= earliest)
        .map((at) => ({ at, label: clock(m) })),
    );
    const slots = new Map<string, AvailabilitySlot>();
    for (const staff of snapshot.staff.filter(
      (s) => query.staff_id === 'any' || s.id === query.staff_id,
    )) {
      const allowed = instantRanges(
        intersectIntervals(
          salon,
          effectiveHours(staff.hours, snapshot.exceptions, date, staff.id),
        ).map((h) => ({ start: minute(h.start_local), end: minute(h.end_local, true) })),
        segments,
      );
      const busy = normalizeRanges(busyByStaff.get(staff.id) ?? []);
      for (const { at, label } of grid) {
        const end = at + service.duration_minutes * MINUTE_MS;
        const occupied = {
          start: at - service.buffer_before_minutes * MINUTE_MS,
          end: end + service.buffer_after_minutes * MINUTE_MS,
        };
        if (
          occupied.start < dayStart ||
          occupied.end > dayEnd ||
          !allowed.some((r) => occupied.start >= r.start && occupied.end <= r.end) ||
          busy.some((r) => overlaps(occupied, r))
        )
          continue;
        const key = `${at}/${end}`,
          existing = slots.get(key);
        if (existing) existing.available_staff_count++;
        else
          slots.set(key, {
            starts_at: new Date(at).toISOString(),
            ends_at: new Date(end).toISOString(),
            start_local: label,
            end_local: localClock(end, date),
            available_staff_count: 1,
          });
      }
    }
    const ordered = [...slots.values()].sort(
      (a, b) => a.starts_at.localeCompare(b.starts_at) || a.ends_at.localeCompare(b.ends_at),
    );
    total += ordered.length;
    if (total > availabilityLimits.responseSlots)
      throw new CapabilityError(503, 'AVAILABILITY_LIMIT', 'دریافت زمان‌ها موقتاً ممکن نیست.');
    days.push({ local_date: date, slots: ordered });
  }
  return days;
}

/** Validates existing frozen allocations without applying new-booking notice or current service duration. */
export function fitsWorkingHours(
  snapshot: AvailabilitySnapshot,
  staffId: string,
  date: string,
  occupied: TimeRange,
): boolean {
  const staff = snapshot.staff.find((s) => s.id === staffId);
  if (!staff) return false;
  const allowed = instantRanges(
    intersectIntervals(
      effectiveHours(snapshot.hours, snapshot.exceptions, date, null),
      effectiveHours(staff.hours, snapshot.exceptions, date, staffId),
    ).map((h) => ({ start: minute(h.start_local), end: minute(h.end_local, true) })),
    daySegments(date),
  );
  return (
    occupied.start >= dayBoundary(date, 0) &&
    occupied.end <= dayBoundary(date, 1440, true) &&
    allowed.some((r) => occupied.start >= r.start && occupied.end <= r.end)
  );
}
