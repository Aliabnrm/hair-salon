import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AvailabilityScreen } from '../../../../features/availability';
import { loadPublicProfile } from '../../../../features/public-catalog/api/profile.server';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'بررسی زمان‌های سالن | آراسته',
  robots: { index: false, follow: false },
};
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const profile = await loadPublicProfile(businessId);
  return (
    <Suspense
      fallback={
        <p
          role="status"
          className="p-5"
        >
          در حال آماده‌سازی انتخاب زمان…
        </p>
      }
    >
      <AvailabilityScreen profile={profile} />
    </Suspense>
  );
}
