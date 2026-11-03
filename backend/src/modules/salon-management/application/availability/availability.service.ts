import { Injectable } from '@nestjs/common';
import { AvailabilityReader } from '../ports/availability-reader.js';
import { Clock } from '../ports/clock.js';
import {
  availabilityPolicy,
  availabilityQuery,
} from '../../domain/availability/availability-query.js';
import { calculateAvailability } from '../../domain/availability/availability-policy.js';
import type { AvailabilityResult } from '../../domain/availability/availability.types.js';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly reader: AvailabilityReader,
    private readonly clock: Clock,
  ) {}
  async get(business: string, input: unknown): Promise<AvailabilityResult> {
    const now = this.clock.now(),
      policy = availabilityPolicy(now);
    const query = availabilityQuery(input, policy);
    const snapshot = await this.reader.read(business, query);
    const { id, name, price_irr, duration_minutes } = snapshot.service;
    return {
      ...query,
      business_id: business,
      service: { id, name, price_irr, duration_minutes },
      timezone: snapshot.timezone,
      checked_at: now.toISOString(),
      policy,
      availability_basis: 'schedule_only',
      booking_enabled: false,
      // Baseline has no Appointment/allocation model. This is schedule capacity, not free inventory.
      days: calculateAvailability(snapshot, query, now, new Map()),
    };
  }
}
