import { invalid } from '../../../common/domain/capability-error.js';
import { object, integer, bool, isoDate, uuid } from './validation.js';
import type { Interval, WeeklyInterval, ExceptionInput } from './management.types.js';
export function minute(value: unknown, end = false): number {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    if (end && value === '24:00') return 1440;
    invalid('intervals', 'زمان باید به صورت HH:mm باشد.');
  }
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export function clock(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export function intervals(value: unknown): Interval[] {
  if (!Array.isArray(value) || value.length > 4)
    invalid('intervals', 'حداکثر چهار بازه در هر روز مجاز است.');
  const result = value
    .map((v) => {
      const p = object(v, ['start_local', 'end_local']);
      const start = minute(p.start_local),
        end = minute(p.end_local, true);
      if (start >= end) invalid('intervals', 'شروع باید قبل از پایان و در همان روز باشد.');
      return { start_local: clock(start), end_local: clock(end) };
    })
    .sort((a, b) => a.start_local.localeCompare(b.start_local));
  for (let i = 1; i < result.length; i++) {
    const a = result[i - 1],
      b = result[i];
    if (a && b && a.end_local > b.start_local) invalid('intervals', 'بازه‌ها هم‌پوشانی دارند.');
  }
  return result;
}
export function weekly(value: unknown): WeeklyInterval[] {
  const p = object(value, ['intervals']);
  if (!Array.isArray(p.intervals) || p.intervals.length > 28) invalid('intervals');
  const days = new Map<number, unknown[]>();
  for (const v of p.intervals) {
    const row = object(v, ['weekday', 'start_local', 'end_local']);
    const day = integer(row.weekday, 'weekday', 0, 6);
    const group = days.get(day) ?? [];
    group.push({ start_local: row.start_local, end_local: row.end_local });
    days.set(day, group);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([weekday, rows]) => intervals(rows).map((row) => ({ ...row, weekday })));
}
export function exceptionInput(value: unknown): ExceptionInput {
  const p = object(value, ['local_date', 'staff_id', 'closed', 'intervals']);
  const result = {
    local_date: isoDate(p.local_date),
    staff_id: p.staff_id === null ? null : uuid(p.staff_id, 'staff_id'),
    closed: bool(p.closed, 'closed'),
    intervals: intervals(p.intervals),
  };
  if (result.closed ? result.intervals.length !== 0 : result.intervals.length === 0)
    invalid('intervals', 'روز تعطیل بدون بازه و روز باز با حداقل یک بازه ثبت می‌شود.');
  return result;
}
export function intersectIntervals(a: Interval[], b: Interval[]): Interval[] {
  return a.flatMap((x) =>
    b.flatMap((y) => {
      const start = Math.max(minute(x.start_local), minute(y.start_local)),
        end = Math.min(minute(x.end_local, true), minute(y.end_local, true));
      return start < end ? [{ start_local: clock(start), end_local: clock(end) }] : [];
    }),
  );
}
