import { describe, it, expect } from 'vitest';
import { outcomeInput, ensureOutcome, blockInput, ensureBlock } from './salon-operations.js';
const a = {
  status: 'confirmed' as const,
  version: 1,
  starts_at: '2026-11-03T07:00:00.000Z',
  ends_at: '2026-11-03T07:30:00.000Z',
};
describe('salon operation policies', () => {
  it('allows exact completion and no-show boundaries, never earlier', () => {
    expect(() =>
      ensureOutcome(a, { status: 'completed', reason: null }, 1, new Date(a.ends_at)),
    ).not.toThrow();
    expect(() =>
      ensureOutcome(
        a,
        { status: 'completed', reason: null },
        1,
        new Date('2026-11-03T07:29:59.999Z'),
      ),
    ).toThrow();
    expect(() =>
      ensureOutcome(a, { status: 'no_show', reason: null }, 1, new Date('2026-11-03T07:15:00Z')),
    ).not.toThrow();
    expect(() =>
      ensureOutcome(
        a,
        { status: 'no_show', reason: null },
        1,
        new Date('2026-11-03T07:14:59.999Z'),
      ),
    ).toThrow();
  });
  it('requires correction reason, rejects cancelled/stale/no-op and allows reset to unknown result', () => {
    const completed = { ...a, status: 'completed' as const };
    expect(() =>
      ensureOutcome(completed, { status: 'confirmed', reason: null }, 1, new Date(a.ends_at)),
    ).toThrow();
    expect(() =>
      ensureOutcome(
        completed,
        { status: 'confirmed', reason: 'اصلاح نتیجه اشتباه' },
        1,
        new Date(a.ends_at),
      ),
    ).not.toThrow();
    expect(() =>
      ensureOutcome(
        { ...a, status: 'cancelled' },
        { status: 'completed', reason: 'اصلاح' },
        1,
        new Date(a.ends_at),
      ),
    ).toThrow();
    expect(() =>
      ensureOutcome(a, { status: 'completed', reason: null }, 2, new Date(a.ends_at)),
    ).toThrow();
    expect(() =>
      ensureOutcome(a, { status: 'confirmed', reason: null }, 1, new Date(a.ends_at)),
    ).toThrow();
  });
  it('allowlists fields and validates an explicit result', () => {
    expect(() => outcomeInput({ status: 'cancelled' })).toThrow();
    expect(() => outcomeInput({ status: 'completed', actor: 'someone' })).toThrow();
    expect(outcomeInput({ status: 'no_show' })).toEqual({ status: 'no_show', reason: null });
  });
  it('validates block interval, horizon, quarter-hour grid and reason', () => {
    const b = blockInput({
        staff_id: 'ec68ccdc-1a40-47af-a289-26679b756c09',
        starts_at: '2026-11-03T07:00:00.000Z',
        ends_at: '2026-11-03T08:00:00.000Z',
        reason: 'استراحت متخصص',
      }),
      now = new Date('2026-11-03T06:00:00Z');
    expect(() => ensureBlock(b, now)).not.toThrow();
    for (const patch of [
      { ends_at: b.starts_at },
      { starts_at: '2026-11-03T07:01:00.000Z' },
      { ends_at: '2026-11-04T08:00:00.000Z' },
      { starts_at: '2026-12-04T07:00:00.000Z', ends_at: '2026-12-04T08:00:00.000Z' },
    ])
      expect(() => ensureBlock({ ...b, ...patch }, now)).toThrow();
    expect(() => ensureBlock(b, new Date('2026-11-03T07:00:00.001Z'))).toThrow();
    expect(() => blockInput({ ...b, business_id: 'override' })).toThrow();
  });
});
