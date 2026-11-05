import { formatPrice } from '../../public-catalog';
import { persianDate } from '../../../lib/format/local-date';
import { appointmentTime, tehranDate } from '../model/booking-values';
import type { Appointment } from '../model/booking.types';
export function AppointmentSummary({ item }: { item: Appointment }) {
  const s = item.snapshot;
  return (
    <section className="rounded-3xl border border-petrol/20 bg-surface p-5">
      <h2 className="mb-5 text-lg font-extrabold">جزئیات نوبت</h2>
      <dl className="space-y-4 text-sm leading-8">
        {[
          ['سالن', s.business_name],
          ['خدمت', s.service_name],
          ['متخصص', s.staff_name],
          ['تاریخ', persianDate(tehranDate(item.starts_at))],
          ['ساعت', `${appointmentTime(item.starts_at)} تا ${appointmentTime(item.ends_at)}`],
          ['مدت', `${s.duration_minutes.toLocaleString('fa-IR')} دقیقه`],
          ['مبلغ ثبت‌شده', formatPrice(s.price_irr)],
          ['مراجعه‌کننده', s.customer_name],
          ['نشانی', s.business_address ?? 'برای نشانی با سالن هماهنگ کنید.'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex flex-wrap justify-between gap-x-4 gap-y-1"
          >
            <dt className="text-ink-soft">{label}</dt>
            <dd className="max-w-full break-words font-bold">{value}</dd>
          </div>
        ))}
        {s.customer_mobile && (
          <div className="flex flex-wrap justify-between gap-3">
            <dt className="text-ink-soft">موبایل تماس</dt>
            <dd dir="ltr">{s.customer_mobile}</dd>
          </div>
        )}
      </dl>
      <p className="mt-5 border-t border-line pt-4 text-sm leading-8 text-ink-soft">{s.policy}</p>
      {s.business_phone && (
        <a
          href={'tel:' + s.business_phone}
          className="mt-3 inline-flex min-h-11 items-center gap-2 font-bold text-petrol"
        >
          تماس با سالن <bdi>{s.business_phone}</bdi>
        </a>
      )}
    </section>
  );
}
