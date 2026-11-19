import { Injectable } from '@nestjs/common';
import { SalonOperationsStore } from './salon-operations-store.js';
import { outcomeInput, blockInput } from '../domain/salon-operations.js';
import { bookingListQuery, cancellation } from '../domain/booking-policy.js';
import type { BookingCommand } from '../domain/booking.types.js';
import { invalid } from '../../../common/domain/capability-error.js';
@Injectable()
export class SalonOperationsService {
  constructor(private readonly store: SalonOperationsStore) {}
  outcome(c: BookingCommand, b: string, id: string, v: unknown, version: number) {
    return this.store.outcome(c, b, id, outcomeInput(v), version);
  }
  createBlock(c: BookingCommand, b: string, v: unknown) {
    return this.store.createBlock(c, b, blockInput(v));
  }
  releaseBlock(c: BookingCommand, b: string, id: string, v: unknown, version: number) {
    return this.store.releaseBlock(c, b, id, cancellation(v), version);
  }
  resolveBlock(actor: string, b: string, key: unknown, op: unknown) {
    if (typeof key !== 'string' || !/^[-A-Za-z0-9_]{1,64}$/.test(key)) invalid('key');
    if (op !== 'block-create' && op !== 'block-release') invalid('operation');
    return this.store.resolveBlock(actor, b, key, op);
  }
  overview(actor: string, b: string, v: unknown) {
    return this.store.overview(actor, b, bookingListQuery(v, true));
  }
}
