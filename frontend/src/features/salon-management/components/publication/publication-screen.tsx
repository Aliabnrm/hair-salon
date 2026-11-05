'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRemote } from '../../../../lib/hooks/use-remote';
import { Button, buttonStyles } from '../../../../components/ui/button';
import { getPublication, publicationWrite } from '../../api/publication.api';
import { useManagedMutation } from '../../hooks/use-managed-mutation';
import { LoadState, RequestFeedback } from '../request-feedback';
import { ManagementFrame } from '../management-frame';
import { DraftBadge } from '../businesses/draft-badge';
import { PublicationHistory } from './publication-history';
import { PublicationIssues } from './publication-issues';
export function PublicationScreen({ businessId }: { businessId: string }) {
  const query = useRemote(businessId, (s) => getPublication(businessId, s));
  const mutation = useManagedMutation();
  const [consent, setConsent] = useState<number | null>(null);
  const status = !query.loading && !query.error ? query.data : null;
  async function act(action: 'requests' | 'withdrawals') {
    if (!status) return;
    await mutation.execute(
      JSON.stringify([businessId, status.version, action]),
      (key, s) => publicationWrite(businessId, action, status.version, key, s),
      async () => {
        setConsent(null);
        await query.reload();
      },
    );
  }
  return (
    <ManagementFrame title="انتشار سالن">
      <LoadState
        loading={query.loading}
        error={query.error}
        retry={() => void query.reload()}
      />
      {status && (
        <>
          <section className="space-y-4 rounded-3xl border border-line bg-surface p-5">
            <DraftBadge state={status.state} />
            {status.state === 'suspended' && (
              <p className="rounded-2xl bg-clay-soft p-3 leading-8 text-clay">
                دلیل تعلیق را در سابقه بخوانید و اطلاعات را اصلاح کنید. رفع تعلیق توسط مسئول سامانه
                انجام می‌شود؛ ویرایش یا انتشار دوباره توسط مالک، تعلیق را برنمی‌دارد.
              </p>
            )}
            <p className="leading-8 text-ink-soft">
              با تأیید شما، نشانی، موبایل، قیمت خدمات و نام متخصصان انتخاب‌شده بلافاصله برای همه
              نمایش داده می‌شوند و رزرو آنلاین فعال می‌شود. اطلاعات کامل نیازی به تأیید شخص دیگری
              ندارد.
            </p>
            <Link
              href={`/manage/${businessId}/preview`}
              className={buttonStyles.secondary}
            >
              پیش‌نمایش خصوصی
            </Link>
            {status.state === 'published' && (
              <Link
                href={`/salons/${businessId}`}
                className={buttonStyles.ghost}
              >
                مشاهده صفحه عمومی
              </Link>
            )}
          </section>
          <section className="rounded-3xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-lg font-bold">آمادگی انتشار</h2>
            {status.issues.length ? (
              <PublicationIssues
                businessId={businessId}
                issues={status.issues}
              />
            ) : (
              <p className="leading-8 text-petrol-deep">
                {status.state === 'draft' || status.state === 'pending_review'
                  ? 'اطلاعات لازم تکمیل است؛ می‌توانید سالن را همین حالا منتشر کنید.'
                  : 'اطلاعات لازم برای انتشار تکمیل است.'}
              </p>
            )}
          </section>
          <section className="space-y-4 rounded-3xl border border-line bg-surface p-5">
            {status.state === 'draft' || status.state === 'pending_review' ? (
              <>
                <label className="flex min-h-11 items-start gap-3 leading-8">
                  <input
                    type="checkbox"
                    className="mt-2 size-5 shrink-0 accent-petrol"
                    checked={consent === status.version}
                    onChange={(e) => setConsent(e.target.checked ? status.version : null)}
                  />
                  پیش‌نمایش را بررسی کردم و با انتشار آدرس، موبایل، قیمت خدمات و نام متخصصان
                  انتخاب‌شده همین نسخه موافقم.
                </label>
                <Button
                  disabled={
                    status.issues.length > 0 ||
                    consent !== status.version ||
                    mutation.pending ||
                    mutation.uncertain
                  }
                  onClick={() => void act('requests')}
                >
                  انتشار سالن
                </Button>
              </>
            ) : status.state === 'published' ? (
              <>
                <p className="leading-8">
                  سالن شما در فهرست عمومی دیده می‌شود و در زمان‌های آزاد قابل رزرو است.
                </p>
                <Button
                  variant="secondary"
                  disabled={mutation.pending || mutation.uncertain}
                  onClick={() => void act('withdrawals')}
                >
                  توقف انتشار
                </Button>
              </>
            ) : null}
            <RequestFeedback mutation={mutation} />
            {Boolean(mutation.error) && (
              <Button
                variant="ghost"
                onClick={() => void query.reload()}
              >
                دریافت وضعیت تازه
              </Button>
            )}
          </section>
          <PublicationHistory history={status.history} />
        </>
      )}
    </ManagementFrame>
  );
}
