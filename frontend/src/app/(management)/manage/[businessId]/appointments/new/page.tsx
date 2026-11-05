import { notFound } from 'next/navigation';
import { isUuid } from '../../../../../../lib/format/identifier';
import { ManualBookingScreen } from '../../../../../../features/bookings';
export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string; appointmentId: string }>;
}) {
  const { businessId } = await params;
  if (!isUuid(businessId)) notFound();
  return <ManualBookingScreen business={businessId} />;
}
