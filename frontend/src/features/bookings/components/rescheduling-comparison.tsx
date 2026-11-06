import { persianDate } from '../../../lib/format/local-date';
import { formatPrice } from '../../public-catalog';
import { appointmentTime, tehranDate } from '../model/booking-values';
import type { Appointment } from '../model/booking.types';
export function ReschedulingComparison({
  item,
  nextStart,
  staffName,
}: {
  item: Appointment;
  nextStart?: string | undefined;
  staffName: string;
}) {
  function time(start: string) {
    return `${persianDate(tehranDate(start))}، ساعت ${appointmentTime(start)}`;
  }
  return (
    <section
      aria-label="مقایسه زمان فعلی و تازه"
      className="space-y-4 rounded-3xl border border-petrol/20 bg-surface p-5"
    >
      <h2 className="text-lg font-extrabold">مرور تغییر نوبت</h2>
      <p className="text-sm leading-8">
        {item.snapshot.business_name} · {item.snapshot.service_name}
      </p>
      <div className="rounded-2xl bg-sand p-4 text-sm leading-8">
        <p className="font-bold text-ink-soft">زمان فعلی</p>
        <p>{time(item.starts_at)}</p>
        <p>{item.snapshot.staff_name}</p>
      </div>
      <div className="rounded-2xl bg-petrol-soft p-4 text-sm leading-8">
        <p className="font-bold text-petrol">زمان تازه</p>
        <p>{nextStart ? time(nextStart) : 'هنوز انتخاب نکرده‌اید'}</p>
        {nextStart && <p>{staffName}</p>}
      </div>
      <p className="text-sm leading-8">
        مبلغ {formatPrice(item.snapshot.price_irr)} و مدت{' '}
        {item.snapshot.duration_minutes.toLocaleString('fa-IR')} دقیقه حفظ می‌شود. کد پیگیری تغییر
        نمی‌کند.
      </p>
    </section>
  );
}
