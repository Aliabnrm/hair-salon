import { createHash } from 'node:crypto';
import { object, text, integer, uuid } from './validation.js';
import { invalid } from '../../../common/domain/capability-error.js';
import { normalizePersian } from './publication-policy.js';
import type { CatalogQuery } from './publication.types.js';
export function catalogQuery(value: unknown): CatalogQuery {
  const p = object(value, ['q', 'audience', 'category', 'city', 'district', 'cursor', 'limit']);
  const q: CatalogQuery = { limit: 20 };
  for (const [key, max] of [
    ['q', 100],
    ['city', 80],
    ['district', 120],
    ['category', 30],
    ['cursor', 1024],
  ] as const)
    if (p[key] !== undefined) {
      const raw = text(p[key], key, 1, max);
      q[key] = key === 'cursor' || key === 'category' ? raw : normalizePersian(raw);
      if (!q[key]) invalid(key);
    }
  if (p.audience !== undefined) {
    if (p.audience !== 'men' && p.audience !== 'women') invalid('audience');
    q.audience = p.audience;
  }
  if (q.district && !q.city) invalid('district', 'ابتدا شهر را انتخاب کنید.');
  if (p.limit !== undefined)
    q.limit = integer(
      typeof p.limit === 'string' && /^\d+$/.test(p.limit) ? Number(p.limit) : p.limit,
      'limit',
      1,
      50,
    );
  return q;
}
export function catalogScope(q: CatalogQuery) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        q.q ?? null,
        q.audience ?? null,
        q.category ?? null,
        q.city ?? null,
        q.district ?? null,
        'created_at,id',
      ]),
    )
    .digest('hex');
}
export function catalogCursor(q: CatalogQuery): [string | null, string | null] {
  if (!q.cursor) return [null, null];
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(q.cursor)) invalid('cursor');
    const v: unknown = JSON.parse(Buffer.from(q.cursor, 'base64url').toString());
    if (
      !Array.isArray(v) ||
      v.length !== 3 ||
      v[0] !== catalogScope(q) ||
      typeof v[1] !== 'string' ||
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?\+00$/.test(v[1]) ||
      !Number.isFinite(Date.parse(v[1]))
    )
      invalid('cursor');
    return [v[1], uuid(v[2], 'cursor')];
  } catch {
    return invalid('cursor');
  }
}
