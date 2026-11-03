import { invalid } from './capability-error.js';
export function object(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('body');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowed.includes(key)))
    invalid('body', 'فیلد ناشناخته ارسال شده است.');
  return record;
}
export function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') invalid(field);
  const normalized = value.trim();
  if ([...normalized].length < min || [...normalized].length > max) invalid(field);
  return normalized;
}
export function integer(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    invalid(field);
  return value;
}
export function uuid(value: unknown, field = 'id'): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
    invalid(field);
  return value;
}
export function bool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') invalid(field);
  return value;
}
export function isoDate(value: unknown, field = 'local_date'): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < '1900-01-01' ||
    value > '2200-12-31'
  )
    invalid(field);
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) invalid(field);
  return value;
}
export function ids(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) invalid('service_ids');
  const result = value.map((v) => uuid(v, 'service_ids'));
  if (new Set(result).size !== result.length) invalid('service_ids', 'خدمت تکراری انتخاب شده است.');
  return result;
}
