export interface BusinessInput {
  name: string;
  audience: 'men' | 'women';
  city: string;
  district: string | null;
  public_address: string | null;
  public_phone: string | null;
  description?: string | null;
}
export interface Business extends BusinessInput {
  id: string;
  state: 'draft' | 'pending_review' | 'published' | 'suspended';
  timezone: string;
  version: number;
  created_at: string;
}
export interface ServiceInput {
  category_id?: string | null;
  name: string;
  price_irr: number;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
}
export interface SalonService extends ServiceInput {
  id: string;
  active: boolean;
  version: number;
  currency: 'IRR';
}
export interface StaffInput {
  public_visible?: boolean;
  display_name: string;
  service_ids: string[];
}
export interface Staff extends StaffInput {
  id: string;
  active: boolean;
  version: number;
}
export interface Interval {
  start_local: string;
  end_local: string;
}
export interface WeeklyInterval extends Interval {
  weekday: number;
}
export interface Hours {
  version: number;
  intervals: WeeklyInterval[];
}
export interface ExceptionInput {
  local_date: string;
  staff_id: string | null;
  closed: boolean;
  intervals: Interval[];
}
export interface ScheduleException extends ExceptionInput {
  id: string;
  version: number;
  deleted: boolean;
}
export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}
export interface PageQuery {
  limit: number;
  cursor?: string;
  active?: boolean;
  from?: string;
  to?: string;
  staff_id?: string;
}
export interface WriteCommand {
  actorId: string;
  requestId: string;
  businessId?: string;
  key: string;
  operation: string;
  fingerprint: string;
  version?: number;
}
