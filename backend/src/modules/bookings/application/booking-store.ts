import type {
  Appointment,
  BookingCommand,
  CreateBooking,
  BookingListQuery,
  BookingPage,
} from '../domain/booking.types.js';
import type { AvailabilityResult, AvailabilityQuery } from '../../salon-management/public.js';
export abstract class BookingStore {
  abstract resolve(
    actor: string,
    key: string,
    operation: BookingCommand['operation'],
  ): Promise<Appointment>;
  abstract create(command: BookingCommand, input: CreateBooking, now: Date): Promise<Appointment>;
  abstract cancel(
    command: BookingCommand,
    business: string,
    id: string,
    reason: string,
    version: number,
    now: Date,
  ): Promise<Appointment>;
  abstract get(actor: string, id: string, business?: string): Promise<Appointment>;
  abstract list(
    actor: string,
    query: BookingListQuery,
    now: Date,
    business?: string,
  ): Promise<BookingPage>;
  abstract options(
    actor: string,
    business: string,
    query: AvailabilityQuery,
    now: Date,
  ): Promise<AvailabilityResult>;
}
