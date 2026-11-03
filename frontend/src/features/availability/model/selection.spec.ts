import { it, expect } from 'vitest';
import { monthDays, readSelection } from './selection';
import { persianDate, inDays, validLocalDate } from '../../../lib/format/local-date';
it('validates shareable selections including ambiguous duplicate or injected input', () => {
  expect(readSelection(new URLSearchParams('staff_id=any&date=2026-11-03'))).toEqual({
    staff_id: 'any',
    date: '2026-11-03',
  });
  for (const q of [
    'date=2026-02-30',
    'date=2026-11-03&date=2026-11-04',
    'staff_id=bad',
    'start=2026-11-03',
    'service_id[]=x',
    'date=',
  ])
    expect(() => readSelection(new URLSearchParams(q))).toThrow();
});
it('displays Tehran Persian dates across leap Esfand and Nowruz independently of browser timezone', () => {
  expect(persianDate('2025-03-20')).toBe('۱۴۰۳/۱۲/۳۰');
  expect(persianDate('2025-03-21')).toBe('۱۴۰۴/۰۱/۰۱');
  expect(inDays('2025-03-20', 1)).toBe('2025-03-21');
  const groups = monthDays('2025-03-20', '2025-03-22');
  expect(groups.map((g) => g.dates.length)).toEqual([1, 2]);
  expect(monthDays('2026-11-07', '2026-11-07')[0]?.offset).toBe(0);
  expect(validLocalDate('2024-02-29')).toBe(true);
  expect(validLocalDate('2025-02-29')).toBe(false);
});
