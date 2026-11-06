import { Injectable } from '@nestjs/common';
import { availabilityWindow, availabilityPolicy, Clock } from '../../salon-management/public.js';
import { cancellation } from '../domain/booking-policy.js';
import { rescheduleInput } from '../domain/booking-changes.js';
import type { BookingCommand } from '../domain/booking.types.js';
import { BookingChangesStore } from './booking-changes-store.js';
@Injectable()
export class BookingChangesService {
  constructor(
    private readonly store: BookingChangesStore,
    private readonly clock: Clock,
  ) {}
  changes(actor: string, id: string, business?: string) {
    return this.store.changes(actor, id, this.clock.now(), business);
  }
  cancel(command: BookingCommand, id: string, value: unknown, version: number) {
    return this.store.cancel(command, id, cancellation(value), version, this.clock.now());
  }
  reschedule(command: BookingCommand, id: string, value: unknown, version: number) {
    return this.store.reschedule(command, id, rescheduleInput(value), version, this.clock.now());
  }
  options(actor: string, id: string, value: unknown) {
    const now = this.clock.now();
    const query = availabilityWindow(value, availabilityPolicy(now));
    return this.store.options(actor, id, query, now);
  }
}
