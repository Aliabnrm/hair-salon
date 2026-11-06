import { useEffect } from 'react';
import type { BookingChanges } from '../model/booking-changes';
/** Server policy is authoritative; refresh at its deadline without trusting the device clock. */
export function useChangeDeadline(changes: BookingChanges | null, refresh: () => Promise<void>) {
  useEffect(() => {
    if (!changes?.customer_can_change) return;
    const delay = Date.parse(changes.change_deadline) - Date.parse(changes.checked_at) + 100;
    const timer = setTimeout(() => void refresh(), Math.max(100, Math.min(delay, 2_147_000_000)));
    return () => clearTimeout(timer);
  }, [changes, refresh]);
}
