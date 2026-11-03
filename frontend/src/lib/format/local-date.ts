/** ISO is a calendar day, not a browser-local instant. Noon UTC is safe for Tehran display. */
export function dateInstant(iso: string): Date {
  return new Date(iso + 'T12:00:00Z');
}
export function inDays(iso: string, count: number): string {
  const date = dateInstant(iso);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function persianDate(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tehran',
  }).format(dateInstant(iso));
}
export function validLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = dateInstant(value);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
