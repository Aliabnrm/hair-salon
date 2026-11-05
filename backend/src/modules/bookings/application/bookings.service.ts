import { Injectable } from '@nestjs/common';
import { BookingStore } from './booking-store.js';
import { Clock, availabilityQuery, availabilityPolicy } from '../../salon-management/public.js';
import { createBooking, bookingListQuery, cancellation } from '../domain/booking-policy.js';
import { invalid } from '../../../common/domain/capability-error.js';
import type { BookingCommand } from '../domain/booking.types.js';
@Injectable()
export class BookingsService {
  constructor(
    private readonly store: BookingStore,
    private readonly clock: Clock,
  ) {}
  resolve(actor: string, key: unknown, operation: unknown) {
    if (typeof key !== 'string' || !/^[-A-Za-z0-9_]{1,64}$/.test(key)) invalid('key');
    if (operation !== 'online' && operation !== 'manual' && operation !== 'cancel')
      invalid('operation');
    return this.store.resolve(actor, key, operation);
  }
  create(command: BookingCommand, value: unknown, business?: string) {
    const now = this.clock.now(),
      input = createBooking(value, command.operation === 'manual', business);
    return this.store.create(command, input, now);
  }
  cancel(command: BookingCommand, business: string, id: string, value: unknown, version: number) {
    return this.store.cancel(command, business, id, cancellation(value), version, this.clock.now());
  }
  get(actor: string, id: string, business?: string) {
    return this.store.get(actor, id, business);
  }
  list(actor: string, input: unknown, business?: string) {
    return this.store.list(actor, bookingListQuery(input, !!business), this.clock.now(), business);
  }
  options(actor: string, business: string, input: unknown) {
    const now = this.clock.now();
    return this.store.options(
      actor,
      business,
      availabilityQuery(input, availabilityPolicy(now)),
      now,
    );
  }
}
