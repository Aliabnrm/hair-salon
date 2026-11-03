'use client';
import { useEffect, type ReactNode } from 'react';
import { useRemote } from '../../../lib/hooks/use-remote';
import { useSession } from '../../identity/hooks/use-session';
import { reviewAccess } from '../api/review.api';
import { Button } from '../../../components/ui/button';
export function ReviewGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const access = useRemote(session.user?.id ?? 'anonymous', reviewAccess);
  useEffect(() => {
    const refresh = () => void access.reload();
    const timer = setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [access.reload]);
  if (!access.data || access.error)
    return (
      <section className="space-y-4 p-5">
        <h1 className="text-xl font-bold">بررسی انتشار</h1>
        <p role="status">
          {access.loading
            ? 'در حال بررسی دسترسی…'
            : access.error
              ? 'بررسی دسترسی انجام نشد.'
              : 'این حساب دسترسی بررسی انتشار ندارد.'}
        </p>
        <Button onClick={() => void access.reload()}>بررسی دوباره</Button>
      </section>
    );
  return children;
}
