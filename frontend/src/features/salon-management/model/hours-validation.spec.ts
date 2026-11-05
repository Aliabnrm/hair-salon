import { describe, expect, it } from 'vitest';
import { endError, normalizeHours, startError } from './hours-validation';

describe('weekly hours validation', () => {
  it('accepts the end of day and normalizes Persian digits', () => {
    const rows = [{ weekday: 0, start_local: '۰۹:۰۰', end_local: '۲۴:۰۰' }];
    expect(startError(rows, 0)).toBeUndefined();
    expect(endError(rows, 0)).toBeUndefined();
    expect(normalizeHours(rows)).toEqual([
      { weekday: 0, start_local: '09:00', end_local: '24:00' },
    ]);
  });

  it('rejects impossible times, reversed ranges, and overlap on the same day', () => {
    const rows = [
      { weekday: 0, start_local: '09:00', end_local: '12:00' },
      { weekday: 0, start_local: '11:00', end_local: '18:00' },
      { weekday: 1, start_local: '11:00', end_local: '18:00' },
    ];
    expect(startError(rows, 1)).toContain('تداخل');
    expect(startError(rows, 2)).toBeUndefined();
    expect(startError([{ ...rows[0]!, start_local: '24:00' }], 0)).toContain('شروع');
    expect(endError([{ ...rows[0]!, end_local: '08:00' }], 0)).toContain('پس از شروع');
  });
});
