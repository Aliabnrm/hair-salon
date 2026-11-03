import type {
  AvailabilitySnapshot,
  AvailabilityQuery,
} from '../../domain/availability/availability.types.js';
export abstract class AvailabilityReader {
  abstract read(business: string, query: AvailabilityQuery): Promise<AvailabilitySnapshot>;
}
