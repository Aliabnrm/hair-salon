'use client';
import Link from 'next/link';
import { useRemote } from '../../../lib/hooks/use-remote';
import { useSession } from '../../identity/hooks/use-session';
import { reviewAccess } from '../api/review.api';
export function ReviewEntry() {
  const session = useSession();
  const q = useRemote(session.user?.id ?? 'anonymous', reviewAccess);
  return session.user && q.data && !q.error ? (
    <Link
      className="mt-4 flex min-h-12 items-center rounded-2xl border border-line bg-surface p-4 font-bold text-petrol"
      href="/review"
    >
      بررسی درخواست‌های انتشار
    </Link>
  ) : null;
}
