import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  canCustomerChange,
  customerChangeDeadline,
  ensureCustomerChange,
  ensureReplacementTime,
  rescheduleInput,
} from './booking-changes.js';
const a = {
  source: 'online' as const,
  status: 'confirmed' as const,
  starts_at: '2026-11-06T07:00:00.000Z',
  version: 1,
};
describe('customer change policy', () => {
  it('includes the exact two-hour boundary and excludes the next millisecond', () => {
    expect(customerChangeDeadline(a.starts_at)).toBe('2026-11-06T05:00:00.000Z');
    expect(canCustomerChange(a, new Date('2026-11-06T05:00:00Z'))).toBe(true);
    expect(canCustomerChange(a, new Date('2026-11-06T05:00:00.001Z'))).toBe(false);
    expect(() => ensureCustomerChange(a, new Date('2026-11-06T05:00:00.001Z'), 1)).toThrow(
      expect.objectContaining({ code: 'CHANGE_DEADLINE_PASSED' }),
    );
  });
  it('does not let a proposed later destination bypass the current deadline or version', () => {
    expect(() => ensureCustomerChange(a, new Date('2026-11-06T04:00:00Z'), 2)).toThrow(
      expect.objectContaining({ code: 'VERSION_CONFLICT' }),
    );
    expect(canCustomerChange({ ...a, source: 'manual' }, new Date('2026-11-06T04:00:00Z'))).toBe(
      false,
    );
    expect(canCustomerChange({ ...a, status: 'cancelled' }, new Date('2026-11-06T04:00:00Z'))).toBe(
      false,
    );
  });
  it('requires a replacement at least two hours in the future', () => {
    const now = new Date('2026-11-06T05:00:00Z');
    expect(() => ensureReplacementTime(a.starts_at, now)).not.toThrow();
    expect(() => ensureReplacementTime('2026-11-06T06:59:59.999Z', now)).toThrow(
      expect.objectContaining({ code: 'REPLACEMENT_TOO_SOON' }),
    );
  });
  it('allowlists input and normalizes valid instants without admitting invalid dates or snapshot edits', () => {
    const body = { staff_id: randomUUID(), starts_at: '2026-11-06T07:00:00Z' };
    expect(rescheduleInput(body)).toEqual({ ...body, starts_at: a.starts_at });
    for (const patch of [
      { price_irr: 0 },
      { business_id: randomUUID() },
      { starts_at: '2026-11-31T07:00:00Z' },
      { starts_at: '2026-11-06T07:00:00+00:00' },
      { staff_id: 'invalid' },
    ])
      expect(() => rescheduleInput({ ...body, ...patch })).toThrow(
        expect.objectContaining({ status: 422 }),
      );
  });
});
