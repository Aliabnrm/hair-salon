'use client';
import Link from 'next/link';
import { usePaged } from '../../salon-management/hooks/use-paged';
import { reviewQueue } from '../api/review.api';
import { LoadState } from '../../salon-management/components/request-feedback';
import { Button } from '../../../components/ui/button';
export function ReviewQueue() {
  const q = usePaged('review', (signal, cursor) => reviewQueue(signal, cursor));
  return (
    <section className="space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-extrabold">بررسی انتشار سالن‌ها</h1>
      <p className="leading-8 text-ink-soft">
        درخواست‌های منتظر بررسی و سالن‌های منتشرشده یا تعلیق‌شده؛ سالن خودتان در صف نیست.
      </p>
      <LoadState
        loading={q.loading}
        error={q.error}
        retry={() => void q.reload()}
      />
      {!q.error && (
        <ul className="space-y-3">
          {(q.data?.items ?? []).map((b) => (
            <li key={b.id}>
              <Link
                className="block min-h-14 break-words rounded-2xl border border-line bg-surface p-4 font-bold text-petrol"
                href={`/review/${b.id}`}
              >
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!q.loading && !q.error && !(q.data?.items ?? []).length && (
        <p>موردی برای بررسی وجود ندارد.</p>
      )}
      {q.data?.next_cursor && (
        <Button
          onClick={() => void q.next()}
          disabled={q.loading}
        >
          موارد بیشتر
        </Button>
      )}
    </section>
  );
}
