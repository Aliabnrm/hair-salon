import { useCallback, useEffect, useRef, useState } from 'react';
export function useRemote<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const loader = useRef(load);
  loader.current = load;
  const sequence = useRef(0),
    request = useRef<AbortController | null>(null);
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: unknown;
    loading: boolean;
  }>({ key, data: null, error: null, loading: true });
  const reload = useCallback(async () => {
    const revision = ++sequence.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState((old) => ({
      key,
      data: old.key === key ? old.data : null,
      error: null,
      loading: true,
    }));
    try {
      const data = await loader.current(controller.signal);
      if (revision === sequence.current && !controller.signal.aborted)
        setState({ key, data, error: null, loading: false });
    } catch (error) {
      if (revision === sequence.current && !controller.signal.aborted)
        setState({ key, data: null, error, loading: false });
    }
  }, [key]);
  useEffect(() => {
    void reload();
    return () => {
      ++sequence.current;
      request.current?.abort();
    };
  }, [reload]);
  return {
    ...(state.key === key ? state : { key, data: null, error: null, loading: true }),
    reload,
  };
}
