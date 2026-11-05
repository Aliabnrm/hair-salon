import type { AvailabilitySnapshot, TimeRange } from './availability.types.js';
export interface ScheduleInventory extends AvailabilitySnapshot {
  business_name: string;
  business_address: string | null;
  business_phone: string | null;
  service: AvailabilitySnapshot['service'] & { version: number };
  staff: (AvailabilitySnapshot['staff'][number] & { name: string })[];
  busy: { staff_id: string; start: string; end: string }[];
}
export function busyByStaff(snapshot: ScheduleInventory): Map<string, TimeRange[]> {
  const result = new Map<string, TimeRange[]>();
  for (const b of snapshot.busy) {
    const list = result.get(b.staff_id) ?? [];
    list.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
    result.set(b.staff_id, list);
  }
  return result;
}
