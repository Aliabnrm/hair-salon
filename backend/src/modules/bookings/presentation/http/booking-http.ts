import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  SecurityRateLimiter,
  requireCurrentUser,
  type AuthenticatedRequest,
} from '../../../identity/public.js';
import { invalid, CapabilityError } from '../../../../common/domain/capability-error.js';
import { integer } from '../../../../common/domain/input.js';
import type { BookingCommand } from '../../domain/booking.types.js';
function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return (
    '{' +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + canonical(Reflect.get(v, k)))
      .join(',') +
    '}'
  );
}
@Injectable()
export class BookingHttp {
  constructor(private readonly rate: SecurityRateLimiter) {}
  async command(
    r: AuthenticatedRequest,
    operation: BookingCommand['operation'],
  ): Promise<BookingCommand> {
    const actor = requireCurrentUser(r).id;
    await this.rate.consume(
      operation === 'online' || operation === 'manual' ? 'booking-create' : 'booking-change',
      actor,
      operation === 'online' || operation === 'manual' ? 10 : 30,
      60,
    );
    const key = r.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[-A-Za-z0-9_]{1,64}$/.test(key)) invalid('Idempotency-Key');
    return {
      actor,
      key,
      operation,
      fingerprint: createHash('sha256')
        .update(canonical([actor, r.method, r.path, r.body ?? null, r.headers['if-match'] ?? null]))
        .digest('hex'),
    };
  }
  version(r: AuthenticatedRequest): number {
    const v = r.headers['if-match'];
    if (v === undefined)
      throw new CapabilityError(428, 'PRECONDITION_REQUIRED', 'نسخه نوبت برای تغییر لازم است.');
    if (typeof v !== 'string' || !/^"[1-9]\d*"$/.test(v))
      invalid('If-Match', 'نسخه نوبت لازم است؛ دوباره صفحه را دریافت کنید.');
    return integer(Number(v.slice(1, -1)), 'If-Match', 1, 2147483647);
  }
  response(r: AuthenticatedRequest, data: unknown) {
    return { data, meta: { request_id: r.requestId } };
  }
}
