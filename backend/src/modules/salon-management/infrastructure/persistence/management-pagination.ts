import { invalid } from '../../../../common/domain/capability-error.js';
import { uuid } from '../../domain/validation.js';
import type { Page, PageQuery } from '../../domain/management.types.js';
export function scope(query: PageQuery, business: string, kind: string): string {
  return JSON.stringify([
    business,
    kind,
    query.active ?? null,
    query.from ?? null,
    query.to ?? null,
    query.staff_id ?? null,
  ]);
}
export function cursor(query: PageQuery, expected: string): [string | null, string | null] {
  if (!query.cursor) return [null, null];
  try {
    const p: unknown = JSON.parse(Buffer.from(query.cursor, 'base64url').toString());
    if (
      !Array.isArray(p) ||
      p.length !== 3 ||
      p[0] !== expected ||
      typeof p[1] !== 'string' ||
      p[1].length > 40 ||
      !Number.isFinite(Date.parse(p[1]))
    )
      invalid('cursor');
    return [p[1], uuid(p[2], 'cursor')];
  } catch {
    return invalid('cursor');
  }
}
export function page<T extends { id: string }>(
  rows: (T & { cursor_time?: string })[],
  query: PageQuery,
  expected: string,
): Page<T> {
  const selected = rows.slice(0, query.limit),
    last = selected.at(-1);
  const next =
    rows.length > query.limit && last
      ? Buffer.from(JSON.stringify([expected, last.cursor_time, last.id])).toString('base64url')
      : null;
  return {
    items: selected.map((row) => {
      const copy = { ...row };
      delete copy.cursor_time;
      return copy;
    }),
    next_cursor: next,
  };
}
