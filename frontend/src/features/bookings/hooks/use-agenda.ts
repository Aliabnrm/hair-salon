import { useState } from 'react';
import { useBookingResource } from './use-booking-resource';
import { appointmentPage } from '../api/bookings.api';
import { agendaOverview } from '../api/salon-operations.api';
import { allStaff, getBusiness } from '../../salon-management';
import { inDays } from '../../../lib/format/local-date';
import { tehranDate } from '../model/booking-values';
export function useAgenda(business: string) {
  const [date, setDate] = useState(tehranDate()),
    [week, setWeek] = useState(false),
    [staff, setStaff] = useState('any'),
    [status, setStatus] = useState('any'),
    [cursor, setCursor] = useState<string | null>(null);
  const catalog = useBookingResource('agenda-catalog:' + business, async (signal) => {
    const [salon, staff] = await Promise.all([
      getBusiness(business, signal),
      allStaff(business, signal),
    ]);
    return { salon, staff };
  });
  const q = new URLSearchParams({
    date,
    to: week ? inDays(date, 6) : date,
    staff_id: staff,
    status,
  });
  if (cursor) q.set('cursor', cursor);
  const remote = useBookingResource(`agenda:${business}:${q}`, async (signal) => {
    const [page, overview] = await Promise.all([
      appointmentPage(q, signal, business),
      agendaOverview(business, q, signal),
    ]);
    return { ...page, ...overview };
  });
  function changeDate(next: string) {
    setDate(next);
    setCursor(null);
  }
  return {
    date,
    week,
    staff,
    status,
    cursor,
    catalog,
    remote,
    changeDate,
    setCursor,
    changeWeek: (next: boolean) => {
      setWeek(next);
      setCursor(null);
    },
    changeStaff: (next: string) => {
      setStaff(next);
      setCursor(null);
    },
    changeStatus: (next: string) => {
      setStatus(next);
      setCursor(null);
    },
  };
}
