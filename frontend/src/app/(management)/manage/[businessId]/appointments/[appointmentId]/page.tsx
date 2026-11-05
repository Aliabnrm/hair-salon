import { notFound } from 'next/navigation';
import { isUuid } from '../../../../../../lib/format/identifier';
import { AppointmentDetailScreen } from '../../../../../../features/bookings';
export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string; appointmentId: string }>;
}) {
  const { businessId, appointmentId } = await params;
  if (!isUuid(businessId) || !isUuid(appointmentId)) notFound();
  return (
    <AppointmentDetailScreen
      business={businessId}
      id={appointmentId}
    />
  );
}
