export { Clock } from './application/ports/clock.js';
export {
  calculateAvailability,
  fitsWorkingHours,
} from './domain/availability/availability-policy.js';
export { availabilityPolicy, availabilityQuery } from './domain/availability/availability-query.js';
export {
  localDate,
  localClock,
  dayBoundary,
  MINUTE_MS,
  addDays,
} from './domain/availability/time-range.js';
export type {
  AvailabilitySnapshot,
  AvailabilityQuery,
  AvailabilityResult,
  TimeRange,
} from './domain/availability/availability.types.js';
