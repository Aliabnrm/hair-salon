import Link from 'next/link';
import { buttonStyles } from '../../../components/ui/button';
import { persianDate } from '../../../lib/format/local-date';
import { appointmentTime, tehranDate } from '../model/booking-values';
import type { BookingChanges } from '../model/booking-changes';
import { CancellationForm } from './cancellation-form';
export function CustomerAppointmentActions({
  changes,
  refresh,
}: {
  changes: BookingChanges;
  refresh: () => Promise<void>;
}) {
  const a = changes.appointment;
  if (a.status !== 'confirmed') return null;
  return (
    <section
      aria-label="مدیریت نوبت من"
      className="space-y-4 rounded-3xl border border-petrol/20 bg-petrol-soft p-4 sm:p-5"
    >
      <div>
        <h2 className="text-lg font-extrabold">برنامه‌تان تغییر کرده؟</h2>
        <p className="mt-2 text-sm leading-8 text-ink-soft">
          لغو و تغییر آنلاین تا دو ساعت پیش از شروع ممکن است؛ بدون پرداخت آنلاین یا جریمه در این
          نسخه.
        </p>
        <p className="mt-2 text-sm font-bold">
          مهلت این نوبت: {persianDate(tehranDate(changes.change_deadline))}، ساعت{' '}
          {appointmentTime(changes.change_deadline)}
        </p>
      </div>
      {changes.customer_can_change ? (
        <>
          <Link
            className={buttonStyles.primary + ' w-full'}
            href={`/appointments/${a.id}/reschedule`}
          >
            تغییر زمان نوبت
          </Link>
          <CancellationForm
            key={a.id + ':' + a.version}
            item={a}
            refresh={refresh}
            customer
          />
        </>
      ) : (
        <p
          role="status"
          className="rounded-2xl bg-surface p-4 text-sm leading-8"
        >
          مهلت تغییر آنلاین این نوبت گذشته است. برای هماهنگی از «تماس با سالن» در جزئیات نوبت
          استفاده کنید.
        </p>
      )}
    </section>
  );
}
