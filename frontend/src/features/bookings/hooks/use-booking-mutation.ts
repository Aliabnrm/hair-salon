import { resolveIntent } from '../api/bookings.api';
import { useResourceMutation } from './use-resource-mutation';
export function useBookingMutation(
  scope: string,
  operation: 'online' | 'manual' | 'cancel' | 'customer-cancel' | 'reschedule' | 'outcome',
) {
  return useResourceMutation(scope, operation, resolveIntent);
}
