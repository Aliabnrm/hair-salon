import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { CapabilityError, invalid } from '../../../../common/domain/capability-error.js';
import {
  SecurityRateLimiter,
  requireCurrentUser,
  type AuthenticatedRequest,
} from '../../../identity/public.js';
import { integer, isoDate, object, text, uuid } from '../../domain/validation.js';
import type { PageQuery, WriteCommand } from '../../domain/management.types.js';
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return (
    '{' +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + canonical(Reflect.get(value, key)))
      .join(',') +
    '}'
  );
}
export function pageQuery(value: unknown, exceptions = false): PageQuery {
  const q = object(
    value,
    exceptions ? ['from', 'to', 'staff_id', 'cursor', 'limit'] : ['active', 'cursor', 'limit'],
  );
  const result: PageQuery = {
    limit:
      q.limit === undefined
        ? 20
        : integer(
            typeof q.limit === 'string' && /^\d+$/.test(q.limit) ? Number(q.limit) : q.limit,
            'limit',
            1,
            50,
          ),
  };
  if (q.cursor !== undefined) result.cursor = text(q.cursor, 'cursor', 1, 1024);
  if (q.active !== undefined) {
    if (q.active !== 'true' && q.active !== 'false') invalid('active');
    result.active = q.active === 'true';
  }
  if (exceptions) {
    result.from = isoDate(q.from, 'from');
    result.to = isoDate(q.to, 'to');
    const days = (Date.parse(result.to) - Date.parse(result.from)) / 86400000;
    if (days < 0 || days > 92) invalid('to', 'بازه حداکثر ۹۳ روز است.');
    if (q.staff_id !== undefined) result.staff_id = uuid(q.staff_id, 'staff_id');
  }
  return result;
}
@Injectable()
export class ManagementHttp {
  constructor(private readonly rate: SecurityRateLimiter) {}
  business(request: AuthenticatedRequest): string {
    return uuid(request.params.businessId, 'businessId');
  }
  id(request: AuthenticatedRequest, name = 'id'): string {
    return uuid(request.params[name], name);
  }
  async command(
    request: AuthenticatedRequest,
    operation: string,
    versioned = false,
    hasBusiness = true,
  ): Promise<WriteCommand> {
    const actor = requireCurrentUser(request);
    await this.rate.consume('management-write', actor.id, 60, 60);
    if (operation === 'business.create')
      await this.rate.consume('business-create', actor.id, 5, 3600);
    const key = request.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(key)) invalid('Idempotency-Key');
    const command: WriteCommand = {
      actorId: actor.id,
      requestId: request.requestId,
      key,
      operation,
      fingerprint: createHash('sha256')
        .update(
          canonical([
            actor.id,
            request.method,
            request.path,
            request.body ?? null,
            request.headers['if-match'] ?? null,
          ]),
        )
        .digest('hex'),
    };
    if (hasBusiness) command.businessId = this.business(request);
    if (versioned) {
      const header = request.headers['if-match'];
      if (header === undefined)
        throw new CapabilityError(
          428,
          'PRECONDITION_REQUIRED',
          'نسخه اطلاعات برای ذخیره لازم است.',
        );
      if (typeof header !== 'string' || !/^"[1-9]\d*"$/.test(header)) invalid('If-Match');
      command.version = integer(Number(header.slice(1, -1)), 'If-Match', 1, 2147483647);
    }
    return command;
  }
  response(request: AuthenticatedRequest, response: Response, data: unknown) {
    if (data && typeof data === 'object' && 'version' in data && typeof data.version === 'number')
      response.setHeader('ETag', `"${data.version}"`);
    return { data, meta: { request_id: request.requestId } };
  }
}
