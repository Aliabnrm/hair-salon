'use client';
import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import * as api from '../api/identity.api';
import type { Credentials, SessionUser } from '../model/identity.types';

interface SessionState {
  user: SessionUser | null;
  status: 'loading' | 'authenticated' | 'anonymous' | 'error';
}
interface SessionContextValue extends SessionState {
  refresh: () => Promise<void>;
  signIn: (credentials: Credentials) => Promise<void>;
  signOut: () => Promise<void>;
}
export const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    user: null,
    status: 'loading',
  });
  const revision = useRef(0);
  const mutation = useRef(false);
  const request = useRef<AbortController | null>(null);
  const pathname = usePathname();
  const refresh = useCallback(async () => {
    if (mutation.current) return;
    const current = ++revision.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const user = await api.currentUser(controller.signal);
      if (current === revision.current)
        setState({ user, status: user ? 'authenticated' : 'anonymous' });
    } catch {
      if (current === revision.current && !controller.signal.aborted)
        setState({ user: null, status: 'error' });
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onFocus);
    return () => {
      ++revision.current;
      request.current?.abort();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onFocus);
    };
  }, [refresh, pathname]);
  const signIn = async (credentials: Credentials) => {
    if (mutation.current)
      throw new Error('An identity change is already pending.');
    mutation.current = true;
    ++revision.current;
    request.current?.abort();
    try {
      const user = await api.signIn(credentials);
      setState({ user, status: 'authenticated' });
    } finally {
      mutation.current = false;
    }
  };
  const signOut = async () => {
    if (mutation.current)
      throw new Error('An identity change is already pending.');
    mutation.current = true;
    ++revision.current;
    request.current?.abort();
    try {
      await api.signOut();
      setState({ user: null, status: 'anonymous' });
    } finally {
      mutation.current = false;
    }
  };
  return (
    <SessionContext.Provider value={{ ...state, refresh, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
