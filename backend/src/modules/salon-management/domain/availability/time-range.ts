import { Temporal } from '@js-temporal/polyfill';
import type { TimeRange } from './availability.types.js';

export const TIMEZONE = 'Asia/Tehran';
export const MINUTE_MS = 60_000;
export function addDays(date: string, count: number): string {
  return Temporal.PlainDate.from(date).add({ days: count }).toString();
}
export function localDate(now: Date): string {
  return Temporal.Instant.fromEpochMilliseconds(now.getTime())
    .toZonedDateTimeISO(TIMEZONE)
    .toPlainDate()
    .toString();
}
export function weekday(date: string): number {
  // Management's weekday 0 is Saturday.
  return (Temporal.PlainDate.from(date).dayOfWeek + 1) % 7;
}
function wallTime(date: string, minute: number) {
  return Temporal.PlainDate.from(date).toPlainDateTime().add({ minutes: minute });
}
/** Gap => no instant; fold => both distinct instants. Never silently move a start. */
export function startInstants(date: string, minute: number): number[] {
  const wall = wallTime(date, minute);
  return [
    ...new Set(
      (['earlier', 'later'] as const).flatMap((disambiguation) => {
        const zoned = wall.toZonedDateTime(TIMEZONE, { disambiguation });
        return zoned.toPlainDateTime().equals(wall) ? [zoned.epochMilliseconds] : [];
      }),
    ),
  ];
}
/** Schedule edges include the repeated hour; nonexistent edges advance across the gap. */
export function dayBoundary(date: string, minute: number, end = false): number {
  const wall = wallTime(date, minute);
  const earlier = wall.toZonedDateTime(TIMEZONE, { disambiguation: 'earlier' });
  return wall.toZonedDateTime(TIMEZONE, {
    disambiguation: end || !earlier.toPlainDateTime().equals(wall) ? 'later' : 'earlier',
  }).epochMilliseconds;
}
export function localClock(instant: number, date: string): string {
  const z = Temporal.Instant.fromEpochMilliseconds(instant).toZonedDateTimeISO(TIMEZONE);
  if (z.toPlainDate().toString() === addDays(date, 1) && z.hour === 0 && z.minute === 0)
    return '24:00';
  return `${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`;
}
/** Partition once at IANA offset transitions; repeated local ranges stay distinct. */
export function daySegments(date: string): (TimeRange & { localStart: number })[] {
  const end = dayBoundary(date, 1440, true);
  const segments: (TimeRange & { localStart: number })[] = [];
  for (let start = dayBoundary(date, 0); start < end;) {
    const zoned = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(TIMEZONE);
    const transition = zoned.getTimeZoneTransition('next');
    const segmentEnd = Math.min(end, transition?.epochMilliseconds ?? end);
    const localStart = zoned
      .toPlainDateTime()
      .since(Temporal.PlainDate.from(date).toPlainDateTime())
      .total('minutes');
    segments.push({ start, end: segmentEnd, localStart });
    start = segmentEnd;
  }
  return segments;
}
export function instantRanges(
  local: TimeRange[],
  segments: (TimeRange & { localStart: number })[],
): TimeRange[] {
  return normalizeRanges(
    segments.flatMap((segment) =>
      local.flatMap((range) => {
        const start = Math.max(
          segment.start,
          segment.start + (range.start - segment.localStart) * MINUTE_MS,
        );
        const end = Math.min(
          segment.end,
          segment.start + (range.end - segment.localStart) * MINUTE_MS,
        );
        return start < end ? [{ start, end }] : [];
      }),
    ),
  );
}
export function normalizeRanges(ranges: TimeRange[]): TimeRange[] {
  const result: TimeRange[] = [];
  for (const range of ranges
    .filter((r) => r.start < r.end)
    .toSorted((a, b) => a.start - b.start || a.end - b.end)) {
    const previous = result.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else result.push({ ...range });
  }
  return result;
}
export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}
