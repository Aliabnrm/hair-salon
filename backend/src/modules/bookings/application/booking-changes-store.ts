import type { Appointment, BookingCommand } from '../domain/booking.types.js';
import type { BookingChanges, RescheduleInput } from '../domain/booking-changes.js';
import type {
  AvailabilityQuery,
  AvailabilityResult,
  AvailabilityPolicy,
} from '../../salon-management/public.js';
export interface ReschedulingOptions extends Omit<AvailabilityResult, 'policy'> {
  policy: Omit<AvailabilityPolicy, 'minimum_notice_minutes'> & { minimum_notice_minutes: 120 };
  appointment_version: number;
  staff: { id: string; name: string }[];
}
export abstract class BookingChangesStore {
  abstract changes(
    actor: string,
    id: string,
    now: Date,
    business?: string,
  ): Promise<BookingChanges>;
  abstract cancel(
    command: BookingCommand,
    id: string,
    reason: string,
    version: number,
    now: Date,
  ): Promise<Appointment>;
  abstract reschedule(
    command: BookingCommand,
    id: string,
    input: RescheduleInput,
    version: number,
    now: Date,
  ): Promise<Appointment>;
  abstract options(
    actor: string,
    id: string,
    query: Omit<AvailabilityQuery, 'service_id'>,
    now: Date,
  ): Promise<ReschedulingOptions>;
}
