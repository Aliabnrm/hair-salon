export interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
  start_local: string;
  end_local: string;
  available_staff_count: number;
}
export interface Availability {
  business_id: string;
  service_id: string;
  service: { id: string; name: string; price_irr: number; duration_minutes: number };
  staff_id: string;
  timezone: 'Asia/Tehran';
  checked_at: string;
  availability_basis: 'live_occupancy';
  booking_enabled: true;
  policy: {
    slot_step_minutes: 15;
    minimum_notice_minutes: 60 | 120;
    first_allowed_date: string;
    last_allowed_date: string;
  };
  from: string;
  to: string;
  days: { local_date: string; slots: AvailabilitySlot[] }[];
}
export interface TimeSelection {
  service_id?: string;
  staff_id?: string;
  date?: string;
}
