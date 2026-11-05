import type { ScheduleInventory } from '../../domain/availability/schedule-inventory.types.js';
import type { AvailabilityQuery } from '../../domain/availability/availability.types.js';
export abstract class AvailabilityReader {
  abstract read(business: string, query: AvailabilityQuery): Promise<ScheduleInventory>;
}
