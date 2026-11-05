import type { PublicProfileData } from '../../public-catalog';
import { formatPrice } from '../../public-catalog';
import { persianDate } from '../../../lib/format/local-date';
import { tehranDate, appointmentTime } from '../model/booking-values';
import type { BookingSelection } from '../model/booking.types';

export function CheckoutSummary({
  profile,
  service,
  selection,
}: {
  profile: PublicProfileData;
  service: Pick<PublicProfileData['services'][number], 'name' | 'price_irr' | 'duration_minutes'>;
  selection: BookingSelection;
}) {
  return (
    <section
      aria-label="جزئیات زمان انتخاب‌شده"
      className="rounded-3xl border border-petrol/20 bg-petrol-soft p-5"
    >
      <h2 className="break-words text-xl font-extrabold">{profile.name}</h2>
      <p className="mt-3 break-words font-bold">{service.name}</p>
      <p className="mt-2 text-sm leading-8">
        {persianDate(tehranDate(selection.starts_at))} · ساعت {appointmentTime(selection.starts_at)}{' '}
        · {service.duration_minutes.toLocaleString('fa-IR')} دقیقه
      </p>
      <p className="mt-2 text-lg font-extrabold text-petrol-deep">
        {formatPrice(service.price_irr)}
      </p>
      <p className="mt-2 text-sm leading-8">
        متخصص:{' '}
        {selection.staff_id === 'any'
          ? 'اولین متخصص آزاد؛ نام نهایی در رسید'
          : (profile.staff.find((s) => s.id === selection.staff_id)?.display_name ??
            'متخصص انتخاب‌شده')}
      </p>
      <p className="mt-2 break-words text-sm leading-8">{profile.public_address}</p>
    </section>
  );
}
