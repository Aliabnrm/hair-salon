import type { Appointment } from './booking.types';
export interface BookingMoment {
  starts_at: string;
  ends_at: string;
  staff_id: string;
  staff_name: string;
}
export interface BookingChangeEvent {
  version: number;
  action: 'created' | 'cancelled' | 'rescheduled';
  actor: 'customer' | 'owner';
  reason: string | null;
  occurred_at: string;
  before: BookingMoment | null;
  after: BookingMoment | null;
}
export interface BookingChanges {
  appointment: Appointment;
  appointment_id: string;
  appointment_version: number;
  checked_at: string;
  change_deadline: string;
  customer_can_change: boolean;
  items: BookingChangeEvent[];
  has_more: boolean;
}
