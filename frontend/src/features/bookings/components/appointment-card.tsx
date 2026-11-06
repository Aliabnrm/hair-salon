import { statusLabels } from '../model/appointment-status';
import Link from 'next/link';
import type { Appointment } from '../model/booking.types';
import { appointmentTime, tehranDate } from '../model/booking-values';
import { persianDate } from '../../../lib/format/local-date';
export function AppointmentCard({ item, owner = false }: { item: Appointment; owner?: boolean }) {
  const root = owner ? `/manage/${item.business_id}/appointments` : '/appointments';
  return (
    <Link
      href={`${root}/${item.id}`}
      className="block rounded-3xl border border-line bg-surface p-5 shadow-sm transition-colors hover:border-petrol/40 focus-visible:outline-2 focus-visible:outline-petrol"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xl font-extrabold text-petrol-deep">
          {appointmentTime(item.starts_at)}{' '}
          <span className="text-sm font-normal text-ink-soft">
            تا {appointmentTime(item.ends_at)}
          </span>
        </p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'confirmed' || item.status === 'completed' ? 'bg-petrol-soft text-petrol-deep' : 'bg-danger-soft text-danger'}`}
        >
          {statusLabels[item.status]}
        </span>
      </div>
      <h2 className="break-words text-lg font-bold">
        {owner ? item.snapshot.customer_name : item.snapshot.business_name}
      </h2>
      <p className="mt-2 break-words text-sm leading-7 text-ink-soft">
        {item.snapshot.service_name} · {item.snapshot.staff_name}
      </p>
      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-sm">
        <span>{persianDate(tehranDate(item.starts_at))}</span>
        <span className="text-muted">
          {item.source === 'online' ? 'رزرو آنلاین' : 'ثبت تلفنی / حضوری'} · مشاهده جزئیات
        </span>
      </div>
    </Link>
  );
}
