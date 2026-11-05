import { useState } from 'react';
import { availability } from '../../availability';
import { publicProfile } from '../../public-catalog';
import { useBookingResource } from './use-booking-resource';
import type { BookingSelection } from '../model/booking.types';
import { tehranDate } from '../model/booking-values';
export function useCheckout(business: string, selection: BookingSelection) {
  const [name, setName] = useState(''),
    [mobile, setMobile] = useState('');
  const remote = useBookingResource(
    'checkout:' + business + JSON.stringify(selection),
    async (signal) => {
      const [profile, times] = await Promise.all([
        publicProfile(business, signal),
        availability(
          business,
          selection.service_id,
          selection.staff_id,
          signal,
          tehranDate(selection.starts_at),
        ),
      ]);
      return {
        profile,
        times,
        slot:
          times.days.flatMap((d) => d.slots).find((s) => s.starts_at === selection.starts_at) ??
          null,
      };
    },
  );
  return { ...remote, name, mobile, setName, setMobile };
}
