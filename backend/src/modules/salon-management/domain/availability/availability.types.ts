import type { Interval, WeeklyInterval } from '../management.types.js';

export const availabilityLimits = {
  slotStepMinutes: 15,
  minimumNoticeMinutes: 60,
  horizonDays: 30,
  queryDays: 7,
  responseSlots: 700,
} as const;

export interface AvailabilityService {
  id: string;
  name: string;
  price_irr: number;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
}
export interface DayOverride {
  local_date: string;
  staff_id: string | null;
  closed: boolean;
  intervals: Interval[];
}
export interface AvailabilitySnapshot {
  business_id: string;
  timezone: 'Asia/Tehran';
  service: AvailabilityService;
  hours: WeeklyInterval[];
  staff: { id: string; hours: WeeklyInterval[] }[];
  exceptions: DayOverride[];
}
/** Epoch milliseconds, including the existing allocation's own buffers. */
export interface TimeRange {
  start: number;
  end: number;
}
export interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
  start_local: string;
  end_local: string;
  available_staff_count: number;
}
export interface AvailabilityQuery {
  service_id: string;
  staff_id: string;
  from: string;
  to: string;
}
export interface AvailabilityPolicy {
  slot_step_minutes: 15;
  minimum_notice_minutes: 60;
  first_allowed_date: string;
  last_allowed_date: string;
}
export interface AvailabilityResult extends AvailabilityQuery {
  business_id: string;
  service: Pick<AvailabilityService, 'id' | 'name' | 'price_irr' | 'duration_minutes'>;
  timezone: 'Asia/Tehran';
  checked_at: string;
  availability_basis: 'live_occupancy';
  booking_enabled: true;
  policy: AvailabilityPolicy;
  days: { local_date: string; slots: AvailabilitySlot[] }[];
}
