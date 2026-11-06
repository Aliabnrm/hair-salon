import { useEffect, useRef, useState } from 'react';
import { HttpFailure } from '../../../lib/api/http-client';
import { resolveIntent } from '../api/bookings.api';
import type { Appointment } from '../model/booking.types';
/** Only the random intent key is persisted. Names, phones and form bodies stay in memory. */
export function useBookingMutation(
  scope: string,
  operation: 'online' | 'manual' | 'cancel' | 'customer-cancel' | 'reschedule',
) {
  const [pending, setPending] = useState(false),
    [waiting, setWaiting] = useState(false),
    [error, setError] = useState<unknown>(null),
    [uncertain, setUncertain] = useState(false),
    [result, setResult] = useState<Appointment | null>(null),
    [recovering, setRecovering] = useState(true);
  const key = useRef<string | null>(null),
    busy = useRef(false),
    alive = useRef(true),
    controller = useRef<AbortController | null>(null);
  const storage = 'hair-salon:booking-intent:' + scope + ':' + operation;
  function clear() {
    key.current = null;
    try {
      sessionStorage.removeItem(storage);
    } catch {
      /* Memory still protects the current tab. */
    }
  }
  useEffect(() => {
    alive.current = true;
    const abort = new AbortController();
    controller.current = abort;
    try {
      key.current = sessionStorage.getItem(storage);
    } catch {
      /* Storage may be disabled. */
    }
    if (key.current) {
      setUncertain(true);
      void resolveIntent(key.current, operation, abort.signal)
        .then((a) => {
          if (alive.current && !abort.signal.aborted) {
            clear();
            setResult(a);
            setUncertain(false);
          }
        })
        .catch((e) => {
          if (
            alive.current &&
            !abort.signal.aborted &&
            e instanceof HttpFailure &&
            e.status === 404
          )
            setUncertain(false);
          if (
            alive.current &&
            !abort.signal.aborted &&
            !(e instanceof HttpFailure && e.status === 404)
          )
            setError(e);
        })
        .finally(() => {
          if (alive.current && !abort.signal.aborted) setRecovering(false);
        });
    } else setRecovering(false);
    return () => {
      alive.current = false;
      abort.abort();
      controller.current?.abort();
    };
    // scope includes actor and resource; mount boundaries reset the hook on identity changes.
  }, [storage, operation]);
  useEffect(() => {
    if (!(error instanceof HttpFailure) || !error.retryAfter) {
      setWaiting(false);
      return;
    }
    setWaiting(true);
    const timer = setTimeout(() => setWaiting(false), Math.min(error.retryAfter, 3600) * 1000);
    return () => clearTimeout(timer);
  }, [error]);
  async function execute(action: (key: string, signal: AbortSignal) => Promise<Appointment>) {
    if (busy.current || recovering || waiting) return;
    busy.current = true;
    setPending(true);
    setError(null);
    const abort = new AbortController();
    controller.current = abort;
    const current = key.current ?? crypto.randomUUID();
    key.current = current;
    try {
      sessionStorage.setItem(storage, current);
    } catch {
      /* Same-tab retry retains the key. */
    }
    try {
      const a = await action(current, abort.signal);
      clear();
      if (alive.current) {
        setResult(a);
        setUncertain(false);
      }
    } catch (e) {
      if (alive.current) {
        setError(e);
        const ambiguous =
          !(e instanceof HttpFailure) || e.status >= 500 || e.code === 'IDEMPOTENCY_CONFLICT';
        setUncertain(ambiguous);
        if (!ambiguous) clear();
      }
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }
  async function check() {
    if (!key.current || busy.current) return;
    busy.current = true;
    setPending(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const a = await resolveIntent(key.current, operation, abort.signal);
      clear();
      if (alive.current) {
        setResult(a);
        setUncertain(false);
        setError(null);
      }
    } catch (e) {
      if (alive.current) {
        if (e instanceof HttpFailure && e.status === 404) setUncertain(false);
        setError(
          e instanceof HttpFailure && e.status === 404
            ? new HttpFailure(
                404,
                'INTENT_PENDING',
                undefined,
                'نتیجه ثبت‌شده‌ای پیدا نشد. اطلاعات را بررسی و دوباره تلاش کنید؛ همان کلید برای جلوگیری از تکرار حفظ شده است.',
              )
            : e,
        );
      }
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }
  return { pending, waiting, error, uncertain, result, recovering, execute, check };
}
