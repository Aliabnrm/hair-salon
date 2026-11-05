import type { Appointment, BookingSnapshot } from '../../domain/booking.types.js';
export const appointmentColumns = `a.id,a.business_id,a.service_id,a.staff_id,a.code,a.source,a.status,a.version,a.starts_at,a.ends_at,a.snapshot,a.cancellation_reason,a.cancelled_at`;
export interface AppointmentRow {
  id: string;
  business_id: string;
  service_id: string;
  staff_id: string;
  code: string;
  source: 'online' | 'manual';
  status: 'confirmed' | 'cancelled';
  version: number;
  starts_at: Date;
  ends_at: Date;
  snapshot: BookingSnapshot;
  cancellation_reason: string | null;
  cancelled_at: Date | null;
}
export function appointment(row: AppointmentRow): Appointment {
  return {
    ...row,
    starts_at: row.starts_at.toISOString(),
    ends_at: row.ends_at.toISOString(),
    cancelled_at: row.cancelled_at?.toISOString() ?? null,
  };
}
