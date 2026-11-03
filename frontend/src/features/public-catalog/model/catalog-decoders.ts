import { record, string, number, array, boolean } from '../../../lib/api/response-values';
import { HttpFailure } from '../../../lib/api/http-client';
import type { PublicProfile, SalonSummary, Category, Location, PublicHours } from './catalog.types';
export const nullable = (v: unknown) => (v === null ? null : string(v));
export function audience(v: unknown): 'men' | 'women' {
  if (v === 'men' || v === 'women') return v;
  throw new HttpFailure(502, 'INVALID_RESPONSE');
}
export function category(v: unknown): Category {
  const p = record(v);
  return { id: string(p.id), label: string(p.label) };
}
export function location(v: unknown): Location {
  const p = record(v);
  return { city: string(p.city), districts: array(p.districts, string) };
}
export function summary(v: unknown): SalonSummary {
  const p = record(v);
  return {
    id: string(p.id),
    name: string(p.name),
    audience: audience(p.audience),
    city: string(p.city),
    district: nullable(p.district),
    min_price_irr: number(p.min_price_irr),
  };
}
export function page<T>(v: unknown, decode: (v: unknown) => T) {
  const p = record(v);
  return { items: array(p.items, decode), next_cursor: nullable(p.next_cursor) };
}
function interval(v: unknown) {
  const p = record(v);
  return { start_local: string(p.start_local), end_local: string(p.end_local) };
}
function hour(v: unknown): PublicHours {
  const p = record(v);
  return { ...interval(p), weekday: number(p.weekday) };
}
export function profile(v: unknown): PublicProfile {
  const p = record(v);
  return {
    id: string(p.id),
    name: string(p.name),
    description: nullable(p.description),
    audience: audience(p.audience),
    city: string(p.city),
    district: nullable(p.district),
    public_address: nullable(p.public_address),
    public_phone: nullable(p.public_phone),
    timezone: string(p.timezone),
    hours: array(p.hours, hour),
    services: array(p.services, (v) => {
      const s = record(v);
      return {
        id: string(s.id),
        name: string(s.name),
        category_id: nullable(s.category_id),
        price_irr: number(s.price_irr),
        duration_minutes: number(s.duration_minutes),
      };
    }),
    staff: array(p.staff, (v) => {
      const s = record(v);
      return {
        id: string(s.id),
        display_name: string(s.display_name),
        service_ids: array(s.service_ids, string),
        hours: array(s.hours, hour),
      };
    }),
    exceptions: array(p.exceptions, (v) => {
      const e = record(v);
      return {
        local_date: string(e.local_date),
        staff_id: nullable(e.staff_id),
        closed: boolean(e.closed),
        intervals: array(e.intervals, interval),
      };
    }),
  };
}
