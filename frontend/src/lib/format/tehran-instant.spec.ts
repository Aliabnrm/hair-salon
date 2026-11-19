import { it, expect } from 'vitest';
import { tehranInstant } from './tehran-instant';
it('resolves Tehran wall time independently of browser timezone and round-trips date boundaries', () => {
  expect(tehranInstant('2026-11-03', '10:30')).toBe('2026-11-03T07:00:00.000Z');
  expect(tehranInstant('2026-11-03', '00:15')).toBe('2026-11-02T20:45:00.000Z');
  expect(() => tehranInstant('2026-02-30', '12:00')).toThrow();
  expect(() => tehranInstant('2026-11-03', '24:00')).toThrow();
});
