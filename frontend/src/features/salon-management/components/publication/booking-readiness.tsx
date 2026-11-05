'use client';
import Link from 'next/link';
import { buttonStyles } from '../../../../components/ui/button';
import { useRemote } from '../../../../lib/hooks/use-remote';
import { getPublication } from '../../api/publication.api';
import type { Publication } from '../../model/publication.types';
import { LoadState } from '../request-feedback';
import { DraftBadge } from '../businesses/draft-badge';
import { PublicationIssues } from './publication-issues';

const visibility: Record<Publication['state'], string> = {
  draft:
    'سالن هنوز در کاوش دیده نمی‌شود. اطلاعات را تکمیل کنید و در بخش انتشار، «انتشار سالن» را بزنید؛ سالن همان لحظه قابل مشاهده و رزرو می‌شود.',
  pending_review:
    'درخواست قبلی هنوز عمومی نشده است. دیگر نیازی به انتظار برای بررسی نیست؛ در بخش انتشار، اطلاعات را تأیید و سالن را مستقیم منتشر کنید.',
  published:
    'سالن در کاوش دیده می‌شود. مشتری می‌تواند در زمان‌های آزاد رزرو کند؛ نوبت قطعی در دفتر همین سالن نمایش داده می‌شود.',
  suspended:
    'نمایش سالن و رزرو آنلاین به دلیل تعلیق متوقف شده است. دلیل را در بخش انتشار بخوانید؛ رفع تعلیق با مسئول سامانه است.',
};

export function BookingReadiness({
  businessId,
  revision,
}: {
  businessId: string;
  revision: number;
}) {
  const query = useRemote(`${businessId}:${revision}`, (signal) =>
    getPublication(businessId, signal),
  );
  const status = !query.loading && !query.error ? query.data : null;
  return (
    <section
      aria-label="آماده‌سازی دریافت نوبت"
      className="space-y-4 rounded-3xl border border-petrol/20 bg-petrol-soft p-5"
    >
      <h2 className="text-xl font-extrabold text-petrol-deep">دریافت نوبت از مشتریان</h2>
      <LoadState
        loading={query.loading}
        error={query.error}
        retry={() => void query.reload()}
      />
      {status && (
        <>
          <DraftBadge state={status.state} />
          <p className="text-sm leading-8 text-ink-soft">{visibility[status.state]}</p>
          {status.issues.length > 0 ? (
            <div className="rounded-2xl bg-surface p-4">
              <h3 className="mb-2 font-bold">برای آماده‌شدن سالن تکمیل کنید</h3>
              <PublicationIssues
                businessId={businessId}
                issues={status.issues}
              />
            </div>
          ) : status.state === 'draft' ? (
            <p className="font-bold leading-8">
              اطلاعات کامل است؛ گام بعد تأیید اطلاعات و انتشار فوری سالن است.
            </p>
          ) : null}
          <Link
            className={buttonStyles.primary + ' w-full'}
            href={
              status.state === 'published'
                ? `/salons/${businessId}`
                : `/manage/${businessId}/publication`
            }
          >
            {status.state === 'published' ? 'مشاهده صفحه عمومی و رزرو' : 'ادامه به انتشار سالن'}
          </Link>
        </>
      )}
      <div className="border-t border-petrol/15 pt-4">
        <Link
          className={buttonStyles.secondary + ' w-full'}
          href={`/manage/${businessId}/appointments`}
        >
          نوبت‌های مشتریان این سالن
        </Link>
        <p className="mt-2 text-sm leading-7 text-ink-soft">
          دفتر سالن، نوبت‌های مشتریان شما را نشان می‌دهد. «نوبت‌های من» در منوی پایین برای
          مراجعه‌های شخصی شماست.
        </p>
      </div>
    </section>
  );
}
