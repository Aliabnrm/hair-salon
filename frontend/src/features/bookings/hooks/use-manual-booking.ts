import { useState } from 'react';
import { allServices, allStaff, getBusiness } from '../../salon-management';
import { useBookingResource } from './use-booking-resource';
import { manualOptions } from '../api/bookings.api';
export function useManualBooking(business: string) {
  const [choice, setChoice] = useState({ service: '', staff: 'any', date: '', start: '' });
  const catalog = useBookingResource('manual-catalog:' + business, async (signal) => {
    const [salon, services, staff] = await Promise.all([
      getBusiness(business, signal),
      allServices(business, signal),
      allStaff(business, signal),
    ]);
    return {
      salon,
      services: services.filter((s) => s.active && s.category_id),
      staff: staff.filter((s) => s.active),
    };
  });
  const service = choice.service || catalog.data?.services[0]?.id || '';
  const staff = choice.staff,
    key = `manual:${business}:${service}:${staff}:${choice.date}`;
  const times = useBookingResource(key, (signal) =>
    service
      ? manualOptions(business, service, staff, choice.date || undefined, signal)
      : Promise.resolve(null),
  );
  const date = choice.date || times.data?.policy.first_allowed_date || '';
  const slots = times.data?.days.find((d) => d.local_date === date)?.slots ?? [];
  const chosen = slots.find((s) => s.starts_at === choice.start);
  const change = (patch: Partial<typeof choice>) =>
    setChoice((old) => ({
      ...old,
      ...patch,
      start: patch.start ?? '',
      ...(patch.service ? { staff: 'any' } : {}),
    }));
  return { catalog, times, service, staff, date, slots, chosen, change };
}
