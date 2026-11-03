import { describe, it, expect } from 'vitest';
import { transition, readiness, normalizePersian } from './publication-policy.js';
import { catalogQuery, catalogCursor, catalogScope } from './catalog-query.js';
import type { PublicProfile, PublicationState } from './publication.types.js';
const profile: PublicProfile = {
  id: 'salon',
  name: 'سالن آراسته',
  description: null,
  audience: 'women',
  city: 'تهران',
  district: null,
  public_address: 'نشانی واقعی سالن',
  public_phone: '+989121234567',
  timezone: 'Asia/Tehran',
  services: [
    { id: 's', name: 'کوتاهی', category_id: 'haircut', price_irr: 0, duration_minutes: 30 },
  ],
  staff: [
    {
      id: 'p',
      display_name: 'متخصص',
      service_ids: ['s'],
      hours: [{ weekday: 0, start_local: '10:00', end_local: '16:00' }],
    },
  ],
  hours: [{ weekday: 0, start_local: '09:00', end_local: '18:00' }],
  exceptions: [],
};
describe('reviewed publication policy', () => {
  it('allows only explicitly defined transitions', () => {
    const allowed = [
      ['draft', 'request', 'pending_review'],
      ['suspended', 'request', 'pending_review'],
      ['pending_review', 'withdraw', 'draft'],
      ['published', 'withdraw', 'draft'],
      ['pending_review', 'approve', 'published'],
      ['pending_review', 'reject', 'draft'],
      ['published', 'suspend', 'suspended'],
    ] as const;
    for (const [state, action, next] of allowed) expect(transition(state, action)).toBe(next);
    for (const state of ['draft', 'pending_review', 'published', 'suspended'] as PublicationState[])
      for (const action of ['request', 'withdraw', 'approve', 'reject', 'suspend'] as const)
        if (!allowed.some(([s, a]) => s === state && a === action))
          expect(() => transition(state, action)).toThrow();
  });
  it('uses service assignment, visibility and real interval intersection without email gates', () => {
    expect(readiness(profile, true)).toEqual([]);
    expect(readiness(profile, true, { s: 600 }).map((i) => i.code)).toContain(
      'HOURS_INTERSECTION_REQUIRED',
    );
    const missing = readiness(
      {
        ...profile,
        public_phone: null,
        services: [
          { id: 'legacy', name: 'قدیمی', category_id: null, price_irr: 0, duration_minutes: 30 },
        ],
        staff: [],
      },
      true,
    );
    expect(missing.map((i) => i.code)).toEqual([
      'PHONE_REQUIRED',
      'CATEGORY_REQUIRED',
      'PUBLIC_STAFF_REQUIRED',
    ]);
    expect(missing[1]).toMatchObject({
      section: 'services',
      field: 'category_id',
      resource_id: 'legacy',
    });
    const adjacent = {
      ...profile,
      staff: [
        {
          id: 'p',
          display_name: 'متخصص',
          service_ids: ['s'],
          hours: [{ weekday: 0, start_local: '18:00', end_local: '19:00' }],
        },
      ],
    };
    expect(readiness(adjacent, true).map((i) => i.code)).toContain('HOURS_INTERSECTION_REQUIRED');
    expect(readiness(profile, false).map((i) => i.code)).toContain('OWNER_REQUIRED');
  });
  it('requires one uninterrupted shared interval including buffers for each public offering', () => {
    const shortHours = {
      ...profile,
      staff: [
        {
          ...profile.staff[0]!,
          hours: [
            { weekday: 0, start_local: '10:00', end_local: '10:20' },
            { weekday: 0, start_local: '11:00', end_local: '11:20' },
          ],
        },
      ],
    };
    expect(readiness(shortHours, true).map((i) => i.code)).toContain('HOURS_INTERSECTION_REQUIRED');
    const exact = {
      ...profile,
      staff: [
        { ...profile.staff[0]!, hours: [{ weekday: 0, start_local: '10:00', end_local: '10:30' }] },
      ],
    };
    expect(readiness(exact, true)).toEqual([]);
    expect(readiness(exact, true, { s: 31 }).map((i) => i.code)).toContain(
      'STAFF_HOURS_INTERSECTION_REQUIRED',
    );
    expect(
      readiness({ ...profile, staff: [{ ...profile.staff[0]!, hours: [] }] }, true).map(
        (i) => i.code,
      ),
    ).toContain('STAFF_HOURS_REQUIRED');
  });
  it('normalizes Persian and treats empty, duplicate, unknown and ambiguous inputs as invalid', () => {
    expect(normalizePersian('  کـوتاهي‌ مويِ  ياس ')).toBe('کوتاهی موی یاس');
    expect(catalogQuery({ q: 'نيلوفر', city: 'كاشان' })).toEqual({
      limit: 20,
      q: 'نیلوفر',
      city: 'کاشان',
    });
    for (const p of [
      { q: ['a', 'b'] },
      { limit: '1e2' },
      { limit: '51' },
      { district: 'سجاد' },
      { role: 'reviewer' },
      { audience: 'all' },
      { q: 'ـَ' },
    ])
      expect(() => catalogQuery(p)).toThrow();
  });
  it('binds keyset cursors to filters and preserves PostgreSQL microseconds', () => {
    const q = catalogQuery({ q: 'یاس' }),
      at = '2026-11-02 10:00:00.123456+00',
      id = '11111111-1111-4111-8111-111111111111';
    const cursor = Buffer.from(JSON.stringify([catalogScope(q), at, id])).toString('base64url');
    expect(catalogCursor({ ...q, cursor })).toEqual([at, id]);
    expect(() => catalogCursor({ ...q, city: 'تهران', cursor })).toThrow();
    for (const cursor of [
      'garbage',
      '***',
      Buffer.from(JSON.stringify([catalogScope(q), 'invalid', id])).toString('base64url'),
    ])
      expect(() => catalogCursor({ ...q, cursor })).toThrow();
  });
});
