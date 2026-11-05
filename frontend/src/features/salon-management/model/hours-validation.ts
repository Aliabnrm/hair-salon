import type { WeeklyInterval } from './management.types';
import { digits } from './form-values';

const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function normalizeHours(rows: WeeklyInterval[]): WeeklyInterval[] {
  return rows.map((row) => ({
    ...row,
    start_local: digits(row.start_local).trim(),
    end_local: digits(row.end_local).trim(),
  }));
}

export function startError(rows: WeeklyInterval[], index: number): string | undefined {
  const row = rows[index];
  if (!row) return undefined;
  const start = digits(row.start_local).trim();
  if (!clock.test(start)) return 'زمان شروع را به شکل 09:00 وارد کنید.';
  const end = digits(row.end_local).trim();
  if (!clock.test(end) && end !== '24:00') return undefined;
  if (start >= end) return 'زمان شروع باید پیش از پایان باشد.';
  const overlaps = rows.some((other, otherIndex) => {
    if (otherIndex >= index || other.weekday !== row.weekday) return false;
    const otherStart = digits(other.start_local).trim();
    const otherEnd = digits(other.end_local).trim();
    return (
      clock.test(otherStart) &&
      (clock.test(otherEnd) || otherEnd === '24:00') &&
      start < otherEnd &&
      otherStart < end
    );
  });
  return overlaps ? 'این بازه با بازه دیگری از همین روز تداخل دارد.' : undefined;
}

export function endError(rows: WeeklyInterval[], index: number): string | undefined {
  const row = rows[index];
  if (!row) return undefined;
  const end = digits(row.end_local).trim();
  if (!clock.test(end) && end !== '24:00') return 'زمان پایان را به شکل 18:00 وارد کنید.';
  const start = digits(row.start_local).trim();
  return clock.test(start) && start >= end ? 'زمان پایان باید پس از شروع باشد.' : undefined;
}
