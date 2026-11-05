import { notFound } from 'next/navigation';
import { isUuid } from '../../../lib/format/identifier';
import { AppointmentDetailScreen } from '../../../features/bookings';
export default async function Page({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  if (!isUuid(appointmentId)) notFound();
  return <AppointmentDetailScreen id={appointmentId} />;
}
