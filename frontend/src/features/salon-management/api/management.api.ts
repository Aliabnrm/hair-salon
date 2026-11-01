import { apiRequest, type RequestOptions } from '../../../lib/api/http-client';
import * as decode from '../model/response-decoders';
import type {
  BusinessInput,
  ServiceInput,
  StaffInput,
  WeeklyInterval,
  ExceptionInput,
} from '../model/management.types';
const root = '/api/v1';
const base = (id: string) => `${root}/businesses/${id}`;
const get = async <T>(path: string, decoder: (v: unknown) => T, signal?: AbortSignal) =>
  decoder(await apiRequest(path, signal ? { signal } : {}));
const write = async <T>(
  path: string,
  method: RequestOptions['method'],
  body: object | undefined,
  key: string,
  version: number | undefined,
  decoder: (v: unknown) => T,
  signal: AbortSignal,
) =>
  decoder(
    await apiRequest(path, {
      ...(method ? { method } : {}),
      ...(body ? { body } : {}),
      idempotencyKey: key,
      ...(version !== undefined ? { version } : {}),
      signal,
    }),
  );
const cursor = (value?: string) =>
  value ? `?cursor=${encodeURIComponent(value)}&limit=50` : '?limit=50';
export const listBusinesses = (signal: AbortSignal, next?: string) =>
  get(`${root}/me/businesses${cursor(next)}`, (v) => decode.page(v, decode.business), signal);
export const getBusiness = (id: string, signal: AbortSignal) =>
  get(`${base(id)}/settings`, decode.business, signal);
export const createBusiness = (body: BusinessInput, key: string, signal: AbortSignal) =>
  write(`${root}/businesses`, 'POST', body, key, undefined, decode.business, signal);
export const updateBusiness = (
  id: string,
  body: BusinessInput,
  version: number,
  key: string,
  signal: AbortSignal,
) => write(`${base(id)}/settings`, 'PATCH', body, key, version, decode.business, signal);
export const listServices = (id: string, signal: AbortSignal, next?: string) =>
  get(`${base(id)}/catalog/services${cursor(next)}`, (v) => decode.page(v, decode.service), signal);
export const createService = (id: string, body: ServiceInput, key: string, signal: AbortSignal) =>
  write(`${base(id)}/services`, 'POST', body, key, undefined, decode.service, signal);
export const updateService = (
  id: string,
  serviceId: string,
  body: Partial<ServiceInput> & { active?: boolean },
  version: number,
  key: string,
  signal: AbortSignal,
) =>
  write(`${base(id)}/services/${serviceId}`, 'PATCH', body, key, version, decode.service, signal);
export const listStaff = (id: string, signal: AbortSignal, next?: string) =>
  get(`${base(id)}/staff${cursor(next)}`, (v) => decode.page(v, decode.staff), signal);
export const createStaff = (id: string, body: StaffInput, key: string, signal: AbortSignal) =>
  write(`${base(id)}/staff`, 'POST', body, key, undefined, decode.staff, signal);
export const updateStaff = (
  id: string,
  staffId: string,
  body: Partial<StaffInput> & { active?: boolean },
  version: number,
  key: string,
  signal: AbortSignal,
) => write(`${base(id)}/staff/${staffId}`, 'PATCH', body, key, version, decode.staff, signal);
export const getHours = (id: string, staff: string | null, signal: AbortSignal) =>
  get(`${base(id)}/${staff ? `staff/${staff}/hours` : 'hours'}`, decode.hours, signal);
export const putHours = (
  id: string,
  staff: string | null,
  intervals: WeeklyInterval[],
  version: number,
  key: string,
  signal: AbortSignal,
) =>
  write(
    `${base(id)}/${staff ? `staff/${staff}/hours` : 'hours'}`,
    'PUT',
    { intervals },
    key,
    version,
    decode.hours,
    signal,
  );
export const listExceptions = (
  id: string,
  from: string,
  to: string,
  signal: AbortSignal,
  next?: string,
) =>
  get(
    `${base(id)}/schedule-exceptions?from=${from}&to=${to}&limit=50${next ? `&cursor=${encodeURIComponent(next)}` : ''}`,
    (v) => decode.page(v, decode.exception),
    signal,
  );
export const createException = (
  id: string,
  body: ExceptionInput,
  key: string,
  signal: AbortSignal,
) =>
  write(`${base(id)}/schedule-exceptions`, 'POST', body, key, undefined, decode.exception, signal);
export const updateException = (
  id: string,
  exceptionId: string,
  body: Pick<ExceptionInput, 'closed' | 'intervals'>,
  version: number,
  key: string,
  signal: AbortSignal,
) =>
  write(
    `${base(id)}/schedule-exceptions/${exceptionId}`,
    'PATCH',
    body,
    key,
    version,
    decode.exception,
    signal,
  );
export const removeException = (
  id: string,
  exceptionId: string,
  version: number,
  key: string,
  signal: AbortSignal,
) =>
  write(
    `${base(id)}/schedule-exceptions/${exceptionId}`,
    'DELETE',
    undefined,
    key,
    version,
    decode.exception,
    signal,
  );

export async function allServices(id: string, signal: AbortSignal) {
  const items = [];
  let next: string | undefined;
  do {
    const p = await listServices(id, signal, next);
    items.push(...p.items);
    next = p.next_cursor ?? undefined;
    if (items.length > 100) throw new Error('تعداد خدمات بیش از حد مجاز است.');
  } while (next);
  return items;
}
export async function allStaff(id: string, signal: AbortSignal) {
  const p = await listStaff(id, signal);
  if (p.next_cursor) throw new Error('تعداد متخصصان بیش از حد مجاز است.');
  return p.items;
}
