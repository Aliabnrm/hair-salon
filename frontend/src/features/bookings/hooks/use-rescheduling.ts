import { useState } from 'react';
import { useSession } from '../../identity';
import {
  getBookingChanges,
  reschedulingOptions,
  rescheduleAppointment,
} from '../api/booking-changes.api';
import { useBookingResource } from './use-booking-resource';
import { useBookingMutation } from './use-booking-mutation';
import { useChangeDeadline } from './use-change-deadline';
export function useRescheduling(id: string) {
  const session = useSession();
  const current = useBookingResource('reschedule-current:' + id, (signal) =>
    getBookingChanges(id, signal),
  );
  const [choice, setChoice] = useState({ staff: '', date: '', start: '' });
  const mutation = useBookingMutation(`${session.user?.id}:${id}`, 'reschedule');
  useChangeDeadline(current.data, current.reload);
  const a = current.data?.appointment;
  const staff = choice.staff || a?.staff_id || 'any';
  const times = useBookingResource(
    `reschedule:${id}:${staff}:${choice.date}:${current.data?.appointment_version}`,
    (signal) =>
      current.data?.customer_can_change
        ? reschedulingOptions(id, staff, choice.date || undefined, signal)
        : Promise.resolve(null),
  );
  const date = choice.date || times.data?.policy.first_allowed_date || '';
  // The current allocation is excluded server-side. Do not offer a no-op with the same specialist.
  const slots = (times.data?.days.find((d) => d.local_date === date)?.slots ?? []).filter(
    (s) => s.starts_at !== a?.starts_at || (staff !== 'any' && staff !== a?.staff_id),
  );
  const chosen = slots.find((s) => s.starts_at === choice.start);
  const locked =
    mutation.pending || mutation.recovering || mutation.uncertain || Boolean(mutation.result);
  const ready =
    !locked &&
    !mutation.waiting &&
    !current.loading &&
    !current.error &&
    current.data?.customer_can_change &&
    !times.loading &&
    !times.error &&
    times.data?.appointment_version === a?.version &&
    Boolean(chosen);
  function change(patch: Partial<typeof choice>) {
    if (!locked) setChoice((old) => ({ ...old, ...patch, start: patch.start ?? '' }));
  }
  function submit() {
    if (!ready || !a || !chosen) return;
    const input = { staff_id: staff, starts_at: chosen.starts_at };
    void mutation.execute((key, signal) =>
      rescheduleAppointment(id, input, a.version, key, signal),
    );
  }
  return {
    current,
    times,
    mutation,
    choice,
    staff,
    date,
    slots,
    chosen,
    locked,
    ready,
    change,
    submit,
  };
}
