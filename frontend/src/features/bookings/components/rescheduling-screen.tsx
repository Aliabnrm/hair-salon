'use client';
import Link from 'next/link';
import { statusTitles } from '../model/appointment-status';
import { AccountGate } from '../../../components/layout/account-gate';
import { PageHeader } from '../../../components/layout/page-header';
import { Button, buttonStyles } from '../../../components/ui/button';
import { useRescheduling } from '../hooks/use-rescheduling';
import { BookingFeedback, MutationFeedback } from './booking-feedback';
import { ReschedulingPicker } from './rescheduling-picker';
import { ReschedulingComparison } from './rescheduling-comparison';
import { AppointmentSummary } from './appointment-summary';
function Content({ id }: { id: string }) {
  const state = useRescheduling(id),
    a = state.current.data?.appointment;
  const result = state.mutation.result;
  return (
    <>
      <PageHeader
        title="تغییر زمان نوبت"
        backHref={`/appointments/${id}`}
        backLabel="بازگشت به جزئیات نوبت"
      />
      <article className="min-w-0 space-y-5 p-4 sm:p-6">
        {result ? (
          <>
            <header
              role="status"
              className="rounded-3xl bg-petrol-soft p-5"
            >
              <h1 className="text-2xl font-extrabold">
                {result.status !== 'confirmed'
                  ? result.status === 'cancelled'
                    ? 'آخرین وضعیت نوبت: لغوشده'
                    : statusTitles[result.status]
                  : 'زمان جدید نوبت ثبت شد'}
              </h1>
              <p className="mt-3 text-sm leading-8">
                اطلاعات زیر از سامانه دریافت شده و در دفتر سالن هم قابل مشاهده است.
              </p>
            </header>
            <AppointmentSummary item={result} />
            <Link
              className={buttonStyles.primary + ' w-full'}
              href={`/appointments/${id}`}
            >
              مشاهده نوبت و تاریخچه
            </Link>
          </>
        ) : (
          <>
            <header className="rounded-3xl bg-petrol-soft p-5">
              <p className="text-sm font-bold text-petrol">مدیریت نوبت من</p>
              <h1 className="mt-2 text-2xl font-extrabold">زمان مناسب‌تری انتخاب کنید</h1>
              <p className="mt-3 text-sm leading-8">
                تا تأیید نهایی، نوبت فعلی شما حفظ می‌شود. زمان تازه باید حداقل دو ساعت با اکنون
                فاصله داشته باشد.
              </p>
            </header>
            <BookingFeedback
              error={state.current.error}
              loading={state.current.loading}
              retry={() => void state.current.reload()}
              returnTo={`/appointments/${id}/reschedule`}
            />
            {a && !state.current.data?.customer_can_change && (
              <p
                role="status"
                className="rounded-2xl bg-sand p-4 text-sm leading-8"
              >
                این نوبت امکان تغییر آنلاین ندارد. برای مشاهده وضعیت فعلی و تماس با سالن به جزئیات
                نوبت برگردید.
              </p>
            )}
            {a && state.current.data?.customer_can_change && (
              <>
                <ReschedulingPicker state={state} />
                <ReschedulingComparison
                  item={a}
                  nextStart={state.chosen?.starts_at}
                  staffName={
                    state.staff === 'any'
                      ? 'اولین متخصص آزاد؛ نام نهایی پس از ثبت مشخص می‌شود'
                      : (state.times.data?.staff.find((s) => s.id === state.staff)?.name ??
                        a.snapshot.staff_name)
                  }
                />
                <MutationFeedback
                  state={state.mutation}
                  returnTo={`/appointments/${id}/reschedule`}
                />
                <div className="space-y-3 rounded-3xl border border-line bg-surface p-4">
                  <p className="text-sm leading-8 text-ink-soft">
                    با تأیید، وقت قبلی آزاد و همین نوبت به زمان تازه منتقل می‌شود. پیامکی ارسال
                    نمی‌شود.
                  </p>
                  <Button
                    className="w-full"
                    disabled={!state.ready}
                    onClick={state.submit}
                  >
                    {state.mutation.pending ? 'در حال ثبت تغییر…' : 'تأیید تغییر زمان'}
                  </Button>
                  {Boolean(state.mutation.error) && !state.mutation.uncertain && (
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => {
                        void state.current.reload();
                        void state.times.reload();
                      }}
                    >
                      دریافت تازه‌ترین نوبت و زمان‌ها
                    </Button>
                  )}
                  <Link
                    className={buttonStyles.ghost + ' w-full'}
                    href={`/appointments/${id}`}
                  >
                    بازگشت به نوبت فعلی
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </article>
    </>
  );
}
export function ReschedulingScreen({ id }: { id: string }) {
  return (
    <AccountGate
      title="تغییر زمان نوبت"
      returnTo={`/appointments/${id}/reschedule`}
    >
      <Content id={id} />
    </AccountGate>
  );
}
