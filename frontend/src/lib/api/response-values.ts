import { HttpFailure, isRecord } from './http-client';
export function record(v: unknown): Record<string, unknown> {
  if (!isRecord(v)) throw new HttpFailure(502, 'INVALID_RESPONSE');
  return v;
}
export function string(v: unknown): string {
  if (typeof v !== 'string') throw new HttpFailure(502, 'INVALID_RESPONSE');
  return v;
}
export function number(v: unknown): number {
  if (typeof v !== 'number' || !Number.isSafeInteger(v))
    throw new HttpFailure(502, 'INVALID_RESPONSE');
  return v;
}
export function boolean(v: unknown): boolean {
  if (typeof v !== 'boolean') throw new HttpFailure(502, 'INVALID_RESPONSE');
  return v;
}
export function array<T>(v: unknown, decode: (x: unknown) => T): T[] {
  if (!Array.isArray(v)) throw new HttpFailure(502, 'INVALID_RESPONSE');
  return v.map(decode);
}
