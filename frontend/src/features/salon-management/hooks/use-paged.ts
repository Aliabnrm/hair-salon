import { useState } from 'react';
import type { Page } from '../model/management.types';
import { useRemote } from '../../../lib/hooks/use-remote';
export function usePaged<T>(
  key: string,
  load: (signal: AbortSignal, cursor?: string) => Promise<Page<T>>,
) {
  const [position, setPosition] = useState<{
    cursor: string | null;
    history: (string | null)[];
  }>({ cursor: null, history: [] });
  const query = useRemote(key + ':' + (position.cursor ?? ''), (signal) =>
    load(signal, position.cursor ?? undefined),
  );
  return {
    ...query,
    next: () => {
      const next = query.data?.next_cursor;
      if (next)
        setPosition((p) => ({
          cursor: next,
          history: [...p.history, p.cursor],
        }));
    },
    previous: () =>
      setPosition((p) => ({
        cursor: p.history.at(-1) ?? null,
        history: p.history.slice(0, -1),
      })),
    hasPrevious: position.history.length > 0,
    reset: async () => {
      setPosition({ cursor: null, history: [] });
      if (position.cursor === null) await query.reload();
    },
  };
}
