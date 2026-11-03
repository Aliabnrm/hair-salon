'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRemote } from '../../../lib/hooks/use-remote';
import { PublicProfile } from '../../public-catalog';
import { PublicationHistory } from '../../salon-management/components/publication/publication-history';
import { DraftBadge } from '../../salon-management/components/businesses/draft-badge';
import { LoadState } from '../../salon-management/components/request-feedback';
import { reviewBusiness } from '../api/review.api';
import { ReviewDecisionForm } from './review-decision-form';
export function ReviewDetail({ businessId }: { businessId: string }) {
  const [denied, setDenied] = useState(false);
  const q = useRemote(businessId, (s) => reviewBusiness(businessId, s));
  useEffect(() => {
    const refresh = () => void q.reload();
    const timer = setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [q.reload]);
  useEffect(() => {
    if (q.data) setDenied(false);
  }, [q.data]);
  const data = !denied && !q.error ? q.data : null;
  return (
    <>
      <div className="space-y-4 p-4">
        <Link
          href="/review"
          className="inline-flex min-h-11 items-center font-bold text-petrol"
        >
          بازگشت به صف بررسی
        </Link>
        <LoadState
          loading={q.loading}
          error={q.error}
          retry={() => void q.reload()}
        />
        {denied && <p role="alert">دسترسی بررسی این سالن معتبر نیست؛ در حال بررسی دوباره…</p>}
        {data && (
          <>
            <DraftBadge state={data.publication.state} />
            {data.publication.issues.length > 0 && (
              <ul>
                {data.publication.issues.map((i, n) => (
                  <li
                    key={n}
                    className="leading-8 text-danger"
                  >
                    {i.message}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      {data && (
        <>
          <PublicProfile profile={data.profile} />
          <div className="space-y-4 p-4">
            {' '}
            <ReviewDecisionForm
              key={data.publication.version}
              businessId={businessId}
              status={data.publication}
              reload={q.reload}
              checking={q.loading}
              onDenied={() => {
                setDenied(true);
                void q.reload();
              }}
            />
            <PublicationHistory history={data.publication.history} />
          </div>
        </>
      )}
    </>
  );
}
