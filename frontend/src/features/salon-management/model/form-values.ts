import { digits } from '../../../lib/format/digits';
export { digits } from '../../../lib/format/digits';
import { isValidJalaaliDate, toGregorian } from 'jalaali-js';
import { FormError } from '../../../lib/forms/form-error';
export { FormError } from '../../../lib/forms/form-error';
export function whole(value: string, field: string, min: number, max: number): number {
  const cleaned = digits(value).replace(/[,٬]/g, '').trim();
  if (!/^\d+$/.test(cleaned)) throw new FormError(field, 'عدد صحیح وارد کنید.');
  const result = Number(cleaned);
  if (!Number.isSafeInteger(result) || result < min || result > max)
    throw new FormError(
      field,
      `عدد باید بین ${min.toLocaleString('fa-IR')} و ${max.toLocaleString('fa-IR')} باشد.`,
    );
  return result;
}
export function tomanToRial(value: string): number {
  return whole(value, 'price_irr', 0, 1_000_000_000) * 10;
}
export function toman(value: number): string {
  return (value / 10).toLocaleString('fa-IR') + ' تومان';
}
export function jalaliToIso(value: string): string {
  const normalized = digits(value).trim();
  if (!/^\d{4}[/]\d{1,2}[/]\d{1,2}$/.test(normalized))
    throw new FormError('local_date', 'تاریخ شمسی مانند ۱۴۰۵/۰۸/۱۰ وارد کنید.');
  const [y, m, d] = normalized.split('/').map(Number);
  if (y === undefined || m === undefined || d === undefined || !isValidJalaaliDate(y, m, d))
    throw new FormError('local_date', 'تاریخ شمسی معتبر نیست.');
  const g = toGregorian(y, m, d),
    iso = `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
  if (iso < '1900-01-01' || iso > '2200-12-31')
    throw new FormError('local_date', 'تاریخ خارج از بازه مجاز است.');
  return iso;
}
export function persianDate(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tehran',
  }).format(new Date(iso + 'T12:00:00Z'));
}
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function inDays(iso: string, count: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}
