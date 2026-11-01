import { useEffect, useRef, useState } from 'react';
import { HttpFailure } from '../../../lib/api/http-client';
import { FormError } from '../model/form-values';
interface Intent {
  fingerprint: string;
  key: string;
  perform: (signal: AbortSignal) => Promise<void>;
}
export function useManagedMutation() {
  const alive = useRef(true),
    busy = useRef(false),
    intent = useRef<Intent | null>(null),
    controller = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null),
    [uncertain, setUncertain] = useState(false),
    [waiting, setWaiting] = useState(false),
    [success, setSuccess] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!(error instanceof HttpFailure) || !error.retryAfter) {
      setWaiting(false);
      return;
    }
    setWaiting(true);
    const timer = setTimeout(() => setWaiting(false), Math.min(error.retryAfter, 3600) * 1000);
    return () => clearTimeout(timer);
  }, [error]);
  async function run(next: Intent) {
    if (busy.current || waiting) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setSuccess(false);
    const abort = new AbortController();
    controller.current = abort;
    try {
      await next.perform(abort.signal);
      if (alive.current) {
        intent.current = null;
        setUncertain(false);
        setSuccess(true);
      }
    } catch (failure) {
      if (alive.current) {
        setError(failure);
        setUncertain(!(failure instanceof HttpFailure) || failure.status >= 500);
      }
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }
  async function execute<T>(
    fingerprint: string,
    action: (key: string, signal: AbortSignal) => Promise<T>,
    onSuccess: (value: T) => void | Promise<void>,
  ) {
    if (uncertain && intent.current?.fingerprint !== fingerprint) return;
    const key =
      intent.current?.fingerprint === fingerprint ? intent.current.key : crypto.randomUUID();
    const next = {
      fingerprint,
      key,
      perform: async (signal: AbortSignal) => {
        const value = await action(key, signal);
        if (alive.current && !signal.aborted) await onSuccess(value);
      },
    };
    intent.current = next;
    await run(next);
  }
  return {
    pending,
    error,
    uncertain,
    waiting,
    success,
    execute,
    retry: () => (intent.current ? run(intent.current) : Promise.resolve()),
    fail: (failure: unknown) => {
      setError(failure);
      setSuccess(false);
    },
    fields:
      error instanceof FormError
        ? { [error.field]: error.message }
        : error instanceof HttpFailure
          ? error.fields
          : {},
  };
}
export type ManagedMutation = ReturnType<typeof useManagedMutation>;
