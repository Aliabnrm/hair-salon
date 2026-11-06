import { isUuid } from '../../../lib/format/identifier';
/** Only known private routes or a complete booking selection can be used after authentication. */
export function safeReturnTo(value: string | null): string {
  if (
    !value ||
    value.length > 1000 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\#]/.test(value)
  )
    return '/account';
  const u = new URL(value, 'https://internal.invalid');
  if (u.origin !== 'https://internal.invalid') return '/account';
  if (/^\/appointments(?:\/[a-f0-9-]{36}(?:\/reschedule)?)?$/.test(u.pathname) && !u.search)
    return u.pathname;
  if (/^\/manage(?:\/[a-f0-9-]{36}(?:\/appointments)?)?$/.test(u.pathname) && !u.search)
    return u.pathname;
  const m = /^\/salons\/([a-f0-9-]{36})\/book$/.exec(u.pathname);
  if (!m || !isUuid(m[1] ?? '')) return '/account';
  const allowed = ['service_id', 'staff_id', 'starts_at'];
  if (
    [...u.searchParams.keys()].some(
      (k) => !allowed.includes(k) || u.searchParams.getAll(k).length !== 1,
    )
  )
    return '/account';
  const s = u.searchParams.get('service_id') ?? '',
    st = u.searchParams.get('staff_id') ?? '',
    at = u.searchParams.get('starts_at') ?? '';
  if (
    !isUuid(s) ||
    (st !== 'any' && !isUuid(st)) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(at) ||
    !Number.isFinite(Date.parse(at))
  )
    return '/account';
  return u.pathname + '?' + new URLSearchParams({ service_id: s, staff_id: st, starts_at: at });
}
