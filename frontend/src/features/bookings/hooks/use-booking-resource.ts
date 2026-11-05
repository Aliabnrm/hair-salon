import { useEffect, useRef } from 'react';
import { useRemote } from '../../../lib/hooks/use-remote';
/** Preserve the last successful response for the same filter when a refresh fails. */
export function useBookingResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const remote = useRemote(key, async (signal) => ({
    value: await load(signal),
    receivedAt: new Date().toISOString(),
  }));
  const last = useRef<{ key: string; data: T; at: string } | null>(null);
  useEffect(() => {
    if (remote.data && !remote.error && !remote.loading)
      last.current = { key, data: remote.data.value, at: remote.data.receivedAt };
  }, [key, remote.data, remote.error, remote.loading]);
  useEffect(() => {
    const focus = () => void remote.reload();
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [remote.reload]);
  return {
    ...remote,
    data: remote.data?.value ?? (last.current?.key === key ? last.current.data : null),
    updatedAt: remote.data?.receivedAt ?? (last.current?.key === key ? last.current.at : null),
  };
}
