import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { publicProfile, type PublicProfileData } from '../../public-catalog';
import { HttpFailure } from '../../../lib/api/http-client';
import { useRemote } from '../../../lib/hooks/use-remote';
import { readSelection } from '../model/selection';
import { availability } from '../api/availability.api';
import type { TimeSelection, Availability } from '../model/availability.types';

export function useAvailability(initialProfile: PublicProfileData) {
  const business = initialProfile.id;
  const search = useSearchParams().toString(),
    path = usePathname();
  const key = `${business}?${search}`;
  const [selected, setSelected] = useState<{ key: string; start: string } | null>(null);
  const [policy, setPolicy] = useState<Availability['policy'] | null>(null);
  const remote = useRemote(key, async (signal) => {
    const selection = readSelection(new URLSearchParams(search));
    const profile = await publicProfile(business, signal);
    const service =
      selection.service_id ??
      profile.services.find(
        (s) => s.category_id && profile.staff.some((st) => st.service_ids.includes(s.id)),
      )?.id;
    if (!service) throw new HttpFailure(404, 'NOT_FOUND');
    const staff = selection.staff_id ?? 'any';
    // Bootstrap the policy from the server clock, including after a tab returns overnight.
    const initial = await availability(business, service, staff, signal);
    const date = selection.date ?? initial.policy.first_allowed_date;
    if (date < initial.policy.first_allowed_date || date > initial.policy.last_allowed_date)
      throw new HttpFailure(
        422,
        'DATE_OUT_OF_RANGE',
        undefined,
        'این تاریخ دیگر در محدوده مجاز نیست. به تاریخ‌های مجاز برگردید.',
      );
    const times = initial.days.some((d) => d.local_date === date)
      ? initial
      : await availability(business, service, staff, signal, date);
    return { profile, times, selection: { service_id: service, staff_id: staff, date } };
  });
  useEffect(() => {
    if (remote.data && !remote.loading && !remote.error) setPolicy(remote.data.times.policy);
  }, [remote.data, remote.loading, remote.error]);
  useEffect(() => {
    const focus = () => {
      void remote.reload();
    };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [remote.reload]);
  // Never let retained remote data expose selectable stale slots during refresh or error.
  const fresh = !remote.loading && !remote.error ? remote.data : null;
  const slots = fresh?.times.days.find((d) => d.local_date === fresh.selection.date)?.slots ?? [];
  const chosen =
    selected?.key === key ? slots.find((s) => s.starts_at === selected.start) : undefined;
  const profile = fresh?.profile ?? initialProfile;
  let intent: TimeSelection = {};
  try {
    intent = readSelection(new URLSearchParams(search));
  } catch {
    /* The loader exposes the validation error. */
  }
  const defaultService = profile.services.find(
    (s) => s.category_id && profile.staff.some((st) => st.service_ids.includes(s.id)),
  )?.id;
  const service = intent.service_id ?? defaultService,
    date = intent.date ?? policy?.first_allowed_date;
  const selection: TimeSelection = {
    ...(service ? { service_id: service } : {}),
    staff_id: intent.staff_id ?? 'any',
    ...(date ? { date } : {}),
  };
  function change(patch: TimeSelection) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...selection, ...patch }))
      if (value) next.set(key, value);
    if (
      patch.service_id &&
      selection.staff_id !== 'any' &&
      !profile.staff.some(
        (s) => s.id === selection.staff_id && s.service_ids.includes(patch.service_id ?? ''),
      )
    )
      next.set('staff_id', 'any');
    setSelected(null);
    window.history.pushState(null, '', `${path}?${next}`);
  }
  function reset() {
    setSelected(null);
    window.history.pushState(null, '', path);
    if (!search) void remote.reload();
  }
  return {
    ...remote,
    fresh,
    slots,
    chosen,
    profile,
    policy,
    selection,
    change,
    reset,
    select: (start: string) => setSelected({ key, start }),
  };
}
