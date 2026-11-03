import { formatPrice } from '../../public-catalog';
import { persianDate } from '../../../lib/format/local-date';
import type { Availability, AvailabilitySlot } from '../model/availability.types';
export function SelectionSummary({
  times,
  slot,
  date,
  staffName,
}: {
  times: Availability;
  slot: AvailabilitySlot;
  date: string;
  staffName: string;
}) {
  return (
    <section
      aria-label="خلاصه انتخاب"
      className="rounded-3xl border border-petrol/20 bg-petrol-soft p-5"
    >
      <h2 className="mb-4 text-xl font-bold text-petrol-deep">خلاصه انتخاب شما</h2>
      <dl className="space-y-3 leading-8">
        {[
          ['خدمت', times.service.name],
          ['متخصص', staffName],
          ['تاریخ', persianDate(date)],
          ['شروع و پایان', `${slot.start_local} تا ${slot.end_local}`],
          ['مدت خدمت', `${times.service.duration_minutes.toLocaleString('fa-IR')} دقیقه`],
          ['قیمت', formatPrice(times.service.price_irr)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex flex-wrap justify-between gap-x-4 gap-y-1"
          >
            <dt className="text-ink-soft">{label}</dt>
            <dd className="break-words font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 border-t border-petrol/15 pt-4 text-sm leading-7">
        این انتخاب نوبت ثبت‌شده نیست و ظرفیت را نگه نمی‌دارد. برای هماهنگی مراجعه با سالن تماس
        بگیرید.
      </p>
    </section>
  );
}
