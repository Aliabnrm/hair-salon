import { HttpFailure } from '../../../lib/api/http-client';
import { isUuid } from '../../../lib/format/identifier';
import { validLocalDate, dateInstant } from '../../../lib/format/local-date';
import type { TimeSelection } from './availability.types';
export function readSelection(query: URLSearchParams): TimeSelection {
  const result: TimeSelection = {};
  for (const key of query.keys()) {
    if (!['service_id', 'staff_id', 'date'].includes(key) || query.getAll(key).length !== 1)
      throw new HttpFailure(
        422,
        'INVALID_SELECTION',
        undefined,
        'نشانی انتخاب معتبر نیست؛ انتخاب‌ها را از نو شروع کنید.',
      );
  }
  for (const key of ['service_id', 'staff_id', 'date'] as const) {
    const value = query.get(key);
    if (value === null) continue;
    const valid =
      key === 'date'
        ? validLocalDate(value)
        : (key === 'staff_id' && value === 'any') || isUuid(value);
    if (!valid)
      throw new HttpFailure(
        422,
        'INVALID_SELECTION',
        undefined,
        'نشانی انتخاب معتبر نیست؛ انتخاب‌ها را از نو شروع کنید.',
      );
    result[key] = key === 'date' ? value : value.toLowerCase();
  }
  return result;
}
export function monthDays(first: string, last: string) {
  const groups: {
    title: string;
    offset: number;
    dates: { iso: string; label: string; full: string }[];
  }[] = [];
  const month = new Intl.DateTimeFormat('fa-IR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Tehran',
  });
  const day = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', timeZone: 'Asia/Tehran' });
  for (let d = dateInstant(first); d <= dateInstant(last); d.setUTCDate(d.getUTCDate() + 1)) {
    const title = month.format(d),
      iso = d.toISOString().slice(0, 10);
    let group = groups.at(-1);
    if (group?.title !== title) {
      group = { title, offset: (d.getUTCDay() + 1) % 7, dates: [] };
      groups.push(group);
    }
    group.dates.push({
      iso,
      label: day.format(d),
      full: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeZone: 'Asia/Tehran' }).format(
        d,
      ),
    });
  }
  return groups;
}
