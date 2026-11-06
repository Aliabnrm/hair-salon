import { conflict, invalid } from '../../../common/domain/capability-error.js';
import { object, text, uuid } from '../../../common/domain/input.js';
import { MINUTE_MS } from '../../salon-management/public.js';
import type { Appointment } from './booking.types.js';
export const CUSTOMER_CHANGE_MINUTES = 120;
export function customerChangeDeadline(startsAt: string): string {
  return new Date(Date.parse(startsAt) - CUSTOMER_CHANGE_MINUTES * MINUTE_MS).toISOString();
}
type ChangeableAppointment = Pick<Appointment, 'source' | 'status' | 'starts_at' | 'version'>;
export function canCustomerChange(a: ChangeableAppointment, now: Date): boolean {
  return (
    a.source === 'online' &&
    a.status === 'confirmed' &&
    now.getTime() <= Date.parse(customerChangeDeadline(a.starts_at))
  );
}
export function ensureCustomerChange(a: ChangeableAppointment, now: Date, version?: number): void {
  if (a.status !== 'confirmed')
    conflict(
      a.status === 'cancelled' ? 'ALREADY_CANCELLED' : 'INVALID_TRANSITION',
      'این نوبت دیگر قابل لغو یا تغییر نیست.',
    );
  if (!canCustomerChange(a, now))
    conflict('CHANGE_DEADLINE_PASSED', 'مهلت لغو یا تغییر آنلاین گذشته است؛ با سالن تماس بگیرید.');
  if (version !== undefined && version !== a.version)
    conflict('VERSION_CONFLICT', 'نوبت تغییر کرده است؛ اطلاعات تازه را دریافت کنید.');
}
export interface RescheduleInput {
  staff_id: string;
  starts_at: string;
}
export function rescheduleInput(value: unknown): RescheduleInput {
  const v = object(value, ['staff_id', 'starts_at']);
  const start = text(v.starts_at, 'starts_at', 20, 30);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?Z$/.test(start) ||
    !Number.isFinite(Date.parse(start)) ||
    new Date(start).toISOString() !== start.replace(/:00Z$/, ':00.000Z')
  ) {
    return invalid('starts_at', 'زمان انتخاب‌شده معتبر نیست.');
  }
  return {
    staff_id: v.staff_id === 'any' ? 'any' : uuid(v.staff_id, 'staff_id'),
    starts_at: new Date(start).toISOString(),
  };
}
export function ensureReplacementTime(start: string, now: Date): void {
  if (Date.parse(start) < now.getTime() + CUSTOMER_CHANGE_MINUTES * MINUTE_MS)
    conflict('REPLACEMENT_TOO_SOON', 'زمان تازه باید حداقل دو ساعت با اکنون فاصله داشته باشد.');
}
export interface BookingMoment {
  starts_at: string;
  ends_at: string;
  staff_id: string;
  staff_name: string;
}
export interface BookingChangeEvent {
  version: number;
  action: 'created' | 'cancelled' | 'rescheduled' | 'outcome' | 'corrected';
  actor: 'customer' | 'owner';
  reason: string | null;
  result_status?: 'confirmed' | 'completed' | 'no_show' | null;
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
