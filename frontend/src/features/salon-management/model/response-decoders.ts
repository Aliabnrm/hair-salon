import { HttpFailure } from '../../../lib/api/http-client';
import type {
  Business,
  SalonService,
  Staff,
  Hours,
  Interval,
  ScheduleException,
  Page,
} from './management.types';
import { record, string, number, boolean, array } from '../../../lib/api/response-values';
const nullable = (v: unknown) => (v === null ? null : string(v));
export function business(v: unknown): Business {
  const p = record(v);
  if (
    (p.audience !== 'men' && p.audience !== 'women') ||
    !['draft', 'pending_review', 'published', 'suspended'].includes(String(p.state))
  )
    throw new HttpFailure(502, 'INVALID_RESPONSE');
  return {
    id: string(p.id),
    name: string(p.name),
    audience: p.audience,
    city: string(p.city),
    district: nullable(p.district),
    public_address: nullable(p.public_address),
    public_phone: nullable(p.public_phone),
    version: number(p.version),
    state: publicationState(p.state),
    description: nullable(p.description),
    timezone: string(p.timezone),
    created_at: string(p.created_at),
  };
}
export function service(v: unknown): SalonService {
  const p = record(v);
  if (p.currency !== 'IRR') throw new HttpFailure(502, 'INVALID_RESPONSE');
  return {
    id: string(p.id),
    name: string(p.name),
    category_id: nullable(p.category_id),
    price_irr: number(p.price_irr),
    duration_minutes: number(p.duration_minutes),
    buffer_before_minutes: number(p.buffer_before_minutes),
    buffer_after_minutes: number(p.buffer_after_minutes),
    active: boolean(p.active),
    version: number(p.version),
    currency: 'IRR',
  };
}
export function staff(v: unknown): Staff {
  const p = record(v);
  return {
    id: string(p.id),
    public_visible: boolean(p.public_visible),
    display_name: string(p.display_name),
    service_ids: array(p.service_ids, string),
    active: boolean(p.active),
    version: number(p.version),
  };
}
export function interval(v: unknown): Interval {
  const p = record(v);
  return { start_local: string(p.start_local), end_local: string(p.end_local) };
}
export function hours(v: unknown): Hours {
  const p = record(v);
  return {
    version: number(p.version),
    intervals: array(p.intervals, (x) => {
      const row = record(x);
      return { ...interval(row), weekday: number(row.weekday) };
    }),
  };
}
export function exception(v: unknown): ScheduleException {
  const p = record(v);
  return {
    id: string(p.id),
    local_date: string(p.local_date),
    staff_id: nullable(p.staff_id),
    closed: boolean(p.closed),
    intervals: array(p.intervals, interval),
    version: number(p.version),
    deleted: boolean(p.deleted),
  };
}
export function page<T>(v: unknown, decode: (x: unknown) => T): Page<T> {
  const p = record(v);
  return {
    items: array(p.items, decode),
    next_cursor: nullable(p.next_cursor),
  };
}

export function publicationState(v: unknown): Business['state'] {
  if (v === 'draft' || v === 'pending_review' || v === 'published' || v === 'suspended') return v;
  throw new HttpFailure(502, 'INVALID_RESPONSE');
}
