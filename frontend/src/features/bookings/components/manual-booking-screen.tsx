'use client';
import { HttpFailure } from '../../../lib/api/http-client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AccountGate } from '../../../components/layout/account-gate';
import { Button, buttonStyles } from '../../../components/ui/button';
import { TextField } from '../../../components/ui/text-field';
import { useSession } from '../../identity';
import { formatPrice } from '../../public-catalog';
import { useManualBooking } from '../hooks/use-manual-booking';
import { useBookingMutation } from '../hooks/use-booking-mutation';
import { createAppointment } from '../api/bookings.api';
import { ContactFields } from './contact-fields';
import { ManualBookingPicker } from './manual-booking-picker';
import { BookingFeedback, MutationFeedback } from './booking-feedback';
function ManualForm({ business }: { business: string }) {
  const [name, setName] = useState(''),
    [mobile, setMobile] = useState(''),
    [reason, setReason] = useState('');
  const state = useManualBooking(business),
    session = useSession(),
    router = useRouter();
  const mutation = useBookingMutation(`${session.user?.id}:${business}`, 'manual');
  useEffect(() => {
    if (mutation.result) router.replace(`/manage/${business}/appointments/${mutation.result.id}`);
  }, [mutation.result, router, business]);
  useEffect(() => {
    if (
      mutation.error instanceof HttpFailure &&
      ['SERVICE_CHANGED', 'SLOT_UNAVAILABLE'].includes(mutation.error.code)
    )
      void state.times.reload();
  }, [mutation.error, state.times.reload]);
  const fresh =
    state.times.data &&
    !state.times.loading &&
    !state.times.error &&
    !state.catalog.error &&
    !state.catalog.loading
      ? state.times.data
      : null;
  const needsReason =
    !!state.chosen &&
    !!fresh &&
    Date.parse(state.chosen.starts_at) < Date.parse(fresh.checked_at) + 60 * 60000;
  return (
    <article className="space-y-5 p-4 sm:p-6">
      <header>
        <Link
          className={buttonStyles.ghost}
          href={`/manage/${business}/appointments`}
        >
          بازگشت به دفتر
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold">ثبت نوبت تلفنی / حضوری</h1>
        <p className="mt-3 text-sm leading-8 text-ink-soft">
          برای {state.catalog.data?.salon.name}؛ این نوبت همان ظرفیت رزرو آنلاین را اشغال می‌کند.
        </p>
      </header>
      <MutationFeedback
        state={mutation}
        returnTo={`/manage/${business}/appointments`}
      />
      <BookingFeedback
        error={state.catalog.error}
        loading={state.catalog.loading}
        retry={() => void state.catalog.reload()}
      />
      <BookingFeedback
        error={state.times.error}
        loading={state.times.loading}
        retry={() => void state.times.reload()}
      />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const chosen = state.chosen;
          if (!fresh || !chosen) return;
          void mutation.execute((key, signal) =>
            createAppointment(
              {
                business_id: business,
                service_id: state.service,
                staff_id: state.staff,
                starts_at: chosen.starts_at,
                expected_price_irr: fresh.service.price_irr,
                expected_duration_minutes: fresh.service.duration_minutes,
                customer_name: name,
                customer_mobile: mobile || null,
                ...(needsReason ? { notice_override_reason: reason } : {}),
              },
              key,
              signal,
              true,
            ),
          );
        }}
      >
        <ManualBookingPicker
          state={state}
          disabled={mutation.pending || mutation.recovering || mutation.waiting}
        />
        {!state.catalog.loading && state.catalog.data && !state.catalog.data.services.length && (
          <p
            role="alert"
            className="rounded-2xl bg-sand p-4 leading-8"
          >
            ابتدا یک خدمت فعال دارای دسته‌بندی، متخصص و ساعات کاری تنظیم کنید.
          </p>
        )}
        {fresh && state.chosen && (
          <section className="rounded-3xl bg-petrol-soft p-5 leading-8">
            <h2 className="font-bold">{fresh.service.name}</h2>
            <p>
              ساعت{' '}
              <bdi>
                {state.chosen.start_local} تا {state.chosen.end_local}
              </bdi>{' '}
              · {formatPrice(fresh.service.price_irr)}
            </p>
          </section>
        )}
        <ContactFields
          name={name}
          mobile={mobile}
          setName={setName}
          setMobile={setMobile}
          manual
          disabled={mutation.pending || mutation.recovering || mutation.waiting}
        />
        {needsReason && (
          <TextField
            label="دلیل ثبت در کمتر از یک ساعت"
            hint="فقط فاصله یک‌ساعته قابل استثناست؛ تداخل و ساعات کاری قابل دورزدن نیستند."
            required
            minLength={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={mutation.pending}
          />
        )}
        <p className="rounded-2xl bg-sand p-4 text-sm leading-8">
          شماره اختیاری است؛ ثبت دستی به حساب مشتری متصل نمی‌شود. پیامک ارسال نمی‌شود و هماهنگی با
          مراجعه‌کننده بر عهده سالن است.
        </p>
        <Button
          type="submit"
          className="w-full"
          disabled={
            !fresh || !state.chosen || mutation.pending || mutation.recovering || mutation.waiting
          }
        >
          {mutation.pending ? 'در حال ثبت…' : 'ثبت قطعی نوبت دستی'}
        </Button>
      </form>
    </article>
  );
}
export function ManualBookingScreen({ business }: { business: string }) {
  return (
    <AccountGate
      title="ثبت دستی نوبت"
      returnTo={`/manage/${business}/appointments`}
    >
      <ManualForm business={business} />
    </AccountGate>
  );
}
