import { notFound } from 'next/navigation';
import { isUuid } from '../../../../lib/format/identifier';
import { ReschedulingScreen } from '../../../../features/bookings';
export default async function Page({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  if (!isUuid(appointmentId)) notFound();
  return <ReschedulingScreen id={appointmentId} />;
}
