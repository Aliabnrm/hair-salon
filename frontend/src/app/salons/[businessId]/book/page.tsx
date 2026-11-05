import { notFound } from 'next/navigation';
import { isUuid } from '../../../../lib/format/identifier';
import { Suspense } from 'react';
import { CheckoutScreen } from '../../../../features/bookings';
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  if (!isUuid(businessId)) notFound();
  return (
    <Suspense
      fallback={
        <p
          role="status"
          className="p-5"
        >
          در حال آماده‌سازی ثبت نوبت…
        </p>
      }
    >
      <CheckoutScreen business={businessId} />
    </Suspense>
  );
}
