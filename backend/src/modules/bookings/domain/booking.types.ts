export interface BookingSnapshot {
  business_name: string;
  business_address: string | null;
  business_phone: string | null;
  service_name: string;
  staff_name: string;
  price_irr: number;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  service_version: number;
  customer_name: string;
  customer_mobile: string | null;
  timezone: 'Asia/Tehran';
  policy: string;
}
export interface Appointment {
  id: string;
  business_id: string;
  service_id: string;
  staff_id: string;
  code: string;
  source: 'online' | 'manual';
  status: 'confirmed' | 'cancelled';
  version: number;
  starts_at: string;
  ends_at: string;
  snapshot: BookingSnapshot;
  cancellation_reason: string | null;
  cancelled_at: string | null;
}
export interface CreateBooking {
  business_id: string;
  service_id: string;
  staff_id: string;
  starts_at: string;
  expected_price_irr: number;
  expected_duration_minutes: number;
  customer_name: string;
  customer_mobile: string | null;
  notice_override_reason: string | null;
}
export interface BookingCommand {
  actor: string;
  key: string;
  fingerprint: string;
  operation: 'online' | 'manual' | 'cancel';
}
export interface BookingPage {
  items: Appointment[];
  next_cursor: string | null;
}
export interface BookingListQuery {
  date?: string;
  staff_id?: string;
  period?: 'upcoming' | 'past';
  cursor?: string;
  limit: number;
}
