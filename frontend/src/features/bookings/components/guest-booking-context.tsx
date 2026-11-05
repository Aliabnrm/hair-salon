import { useRemote } from '../../../lib/hooks/use-remote';
import { publicProfile } from '../../public-catalog';
import type { BookingSelection } from '../model/booking.types';
import { BookingFeedback } from './booking-feedback';
import { CheckoutSummary } from './checkout-summary';

export function GuestBookingContext({
  business,
  selection,
}: {
  business: string;
  selection: BookingSelection;
}) {
  const query = useRemote(business, (signal) => publicProfile(business, signal));
  const service = query.data?.services.find((s) => s.id === selection.service_id);
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold leading-7 text-ink-soft">هنوز نوبتی ثبت نشده است.</p>
      <BookingFeedback
        loading={query.loading}
        error={query.error}
        retry={() => void query.reload()}
      />
      {query.data && service && (
        <CheckoutSummary
          profile={query.data}
          service={service}
          selection={selection}
        />
      )}
      <p className="text-sm leading-8 text-ink-soft">
        پس از ورود، نام و موبایل را وارد کنید و «ثبت نهایی نوبت» را بزنید. زمان انتخاب‌شده تا ثبت
        نهایی نگه داشته نمی‌شود.
      </p>
    </div>
  );
}
