import { persianDate } from '../../../lib/format/local-date';
import { appointmentTime, tehranDate } from '../model/booking-values';
import type { BookingChanges, BookingMoment } from '../model/booking-changes';
export function momentLabel(moment: BookingMoment) {
  return `${persianDate(tehranDate(moment.starts_at))}، ساعت ${appointmentTime(moment.starts_at)} · ${moment.staff_name}`;
}
export function AppointmentHistory({ changes }: { changes: BookingChanges }) {
  return (
    <section
      aria-labelledby="appointment-history-title"
      className="rounded-3xl border border-line bg-surface p-5"
    >
      <h2
        id="appointment-history-title"
        className="text-lg font-extrabold"
      >
        تاریخچه نوبت
      </h2>
      <p className="mt-2 text-sm leading-7 text-muted">
        سابقه ثبت و تغییرات این نوبت برای شما و سالن یکسان است.
      </p>
      <ol className="mt-5 space-y-5">
        {changes.items.map((e) => (
          <li
            key={e.version}
            className="border-s-2 border-petrol/20 ps-4 text-sm leading-8"
          >
            <p className="font-bold">
              {e.action === 'created'
                ? 'ثبت نوبت'
                : e.action === 'cancelled'
                  ? 'لغو نوبت'
                  : 'تغییر زمان یا متخصص'}{' '}
              · {e.actor === 'customer' ? 'توسط مشتری' : 'توسط سالن'}
            </p>
            <p className="text-xs text-muted">
              {persianDate(tehranDate(e.occurred_at))}، {appointmentTime(e.occurred_at)}
            </p>
            {e.before && <p className="mt-2 text-ink-soft">قبل: {momentLabel(e.before)}</p>}
            {e.after && (
              <p className="font-semibold">
                {e.action === 'created' ? 'زمان ثبت‌شده' : 'بعد'}: {momentLabel(e.after)}
              </p>
            )}
            {e.reason && <p className="mt-2 break-words">دلیل: {e.reason}</p>}
          </li>
        ))}
      </ol>
      {changes.has_more && (
        <p className="mt-4 text-xs leading-7 text-muted">
          ۵۰ تغییر اخیر نمایش داده می‌شود؛ سوابق قدیمی‌تر در سامانه محفوظ است.
        </p>
      )}
    </section>
  );
}
