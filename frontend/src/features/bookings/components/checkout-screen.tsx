'use client';
import { HttpFailure } from '../../../lib/api/http-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { AccountGate } from '../../../components/layout/account-gate';
import { PageHeader } from '../../../components/layout/page-header';
import { PageActionBar } from '../../../components/layout/page-action-bar';
import { BookingProgress } from '../../../components/ui/booking-progress';
import { Button, buttonStyles } from '../../../components/ui/button';
import { useSession } from '../../identity';
import { formatPrice } from '../../public-catalog';
import { readBookingSelection, tehranDate } from '../model/booking-values';
import type { BookingSelection } from '../model/booking.types';
import { useCheckout } from '../hooks/use-checkout';
import { useBookingMutation } from '../hooks/use-booking-mutation';
import { createAppointment } from '../api/bookings.api';
import { BookingFeedback, MutationFeedback } from './booking-feedback';
import { ContactFields } from './contact-fields';
import { CheckoutSummary } from './checkout-summary';
import { GuestBookingContext } from './guest-booking-context';
function CheckoutForm({ business, selection }: { business: string; selection: BookingSelection }) {
  const state = useCheckout(business, selection),
    router = useRouter(),
    session = useSession();
  const mutation = useBookingMutation(`${session.user?.id}:${business}`, 'online');
  useEffect(() => {
    if (mutation.result) router.replace('/appointments/' + mutation.result.id);
  }, [mutation.result, router]);
  useEffect(() => {
    if (
      mutation.error instanceof HttpFailure &&
      ['SERVICE_CHANGED', 'SLOT_UNAVAILABLE'].includes(mutation.error.code)
    )
      void state.reload();
  }, [mutation.error, state.reload]);
  const fresh = state.data && !state.loading && !state.error ? state.data : null;
  return (
    <article className="space-y-5 p-4 sm:p-6">
      <MutationFeedback
        state={mutation}
        returnTo={`/salons/${business}/book?${new URLSearchParams({ ...selection })}`}
      />
      <BookingFeedback
        error={state.error}
        loading={state.loading}
        retry={() => void state.reload()}
      />
      {fresh && !fresh.slot && (
        <section
          role="alert"
          className="rounded-3xl bg-sand p-5 leading-8"
        >
          <h2 className="font-bold">این زمان دیگر آزاد نیست</h2>
          <p>هنگام انتخاب یا ورود، ظرفیت نگه داشته نمی‌شود. زمان دیگری انتخاب کنید.</p>
          <Link
            href={`/salons/${business}/times`}
            className={buttonStyles.primary}
          >
            انتخاب زمان دیگر
          </Link>
        </section>
      )}
      {state.data && (
        <CheckoutSummary
          profile={state.data.profile}
          service={state.data.times.service}
          selection={selection}
        />
      )}
      <form
        id="online-booking-form"
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!fresh?.slot) return;
          void mutation.execute((key, signal) =>
            createAppointment(
              {
                ...selection,
                business_id: business,
                expected_price_irr: fresh.times.service.price_irr,
                expected_duration_minutes: fresh.times.service.duration_minutes,
                customer_name: state.name,
                customer_mobile: state.mobile,
              },
              key,
              signal,
            ),
          );
        }}
      >
        <ContactFields
          name={state.name}
          mobile={state.mobile}
          setName={state.setName}
          setMobile={state.setMobile}
          disabled={mutation.pending || mutation.recovering || mutation.waiting}
        />
        <section className="rounded-2xl bg-sand p-4 text-sm leading-8">
          <h2 className="font-bold">لغو یا تغییر نوبت</h2>
          <p>
            برای لغو یا تغییر، با سالن تماس بگیرید. پیامک ارسال نمی‌شود؛ رسیدتان در «نوبت‌های من»
            می‌ماند.
          </p>
          {state.data?.profile.public_phone && (
            <a
              href={'tel:' + state.data.profile.public_phone}
              className="inline-flex min-h-11 items-center font-bold text-petrol"
            >
              تماس با سالن
            </a>
          )}
        </section>
      </form>
      <PageActionBar label="ثبت نهایی نوبت">
        {state.data && (
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-ink-soft">پرداخت در سالن</span>
            <strong>{formatPrice(state.data.times.service.price_irr)}</strong>
          </div>
        )}
        <Button
          type="submit"
          form="online-booking-form"
          className="w-full"
          disabled={!fresh?.slot || mutation.pending || mutation.recovering || mutation.waiting}
        >
          {mutation.pending ? 'در حال ثبت نوبت…' : 'ثبت نهایی نوبت'}
        </Button>
      </PageActionBar>
      <Link
        className={buttonStyles.ghost + ' w-full'}
        href="/appointments"
      >
        مشاهده نوبت‌های من
      </Link>
    </article>
  );
}
export function CheckoutScreen({ business }: { business: string }) {
  const params = useSearchParams(),
    selection = readBookingSelection(new URLSearchParams(params.toString()));
  if (!selection)
    return (
      <section className="space-y-4 p-5">
        <h1 className="text-xl font-bold">انتخاب نوبت معتبر نیست</h1>
        <Link
          className={buttonStyles.primary}
          href={`/salons/${business}/times`}
        >
          انتخاب زمان
        </Link>
      </section>
    );
  const returnTo = `/salons/${business}/book?${new URLSearchParams({ ...selection })}`;
  return (
    <>
      <PageHeader
        title="ثبت نوبت"
        backHref={`/salons/${business}/times?${new URLSearchParams({ service_id: selection.service_id, staff_id: selection.staff_id, date: tehranDate(selection.starts_at) })}`}
        backLabel="بازگشت به انتخاب زمان"
      />
      <div className="space-y-4 px-4 pt-5 sm:px-6">
        <BookingProgress step={3} />
        <h1 className="text-2xl font-extrabold">تأیید و ثبت نوبت</h1>
        <p className="text-sm leading-7 text-ink-soft">
          جزئیات را بررسی کنید. پرداخت هزینه خدمت در سالن است.
        </p>
      </div>
      <AccountGate
        showHeader={false}
        title="ثبت نوبت"
        returnTo={returnTo}
        guestDescription="وارد شوید تا این نوبت را ثبت کنید. انتخاب شما حفظ می‌شود."
        guestContext={
          <GuestBookingContext
            business={business}
            selection={selection}
          />
        }
      >
        <CheckoutForm
          key={returnTo}
          business={business}
          selection={selection}
        />
      </AccountGate>
    </>
  );
}
