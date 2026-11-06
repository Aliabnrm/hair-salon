'use client';
import { AccountGate } from '../../../components/layout/account-gate';
import { PageHeader } from '../../../components/layout/page-header';
import { getBookingChanges } from '../api/booking-changes.api';
import { AppointmentHistory } from './appointment-history';
import { CustomerAppointmentActions } from './customer-appointment-actions';
import { useChangeDeadline } from '../hooks/use-change-deadline';
import { useBookingResource } from '../hooks/use-booking-resource';
import { AppointmentSummary } from './appointment-summary';
import { BookingFeedback } from './booking-feedback';
import { CancellationForm } from './cancellation-form';
function Detail({ id, business }: { id: string; business?: string }) {
  const remote = useBookingResource(`detail:${business ?? 'mine'}:${id}`, (signal) =>
      getBookingChanges(id, signal, business),
    ),
    a = remote.data?.appointment;
  useChangeDeadline(remote.data, remote.reload);
  return (
    <>
      <PageHeader
        title="جزئیات نوبت"
        backHref={business ? `/manage/${business}/appointments` : '/appointments'}
        backLabel="بازگشت به نوبت‌ها"
      />
      <article className="space-y-5 p-4 sm:p-6">
        <BookingFeedback
          error={remote.error}
          loading={remote.loading}
          retry={() => void remote.reload()}
        />
        {a && (
          <>
            <header
              className={`rounded-3xl p-5 ${a.status === 'confirmed' ? 'bg-petrol-soft' : 'bg-danger-soft'}`}
            >
              <p className="text-sm font-bold">
                {a.source === 'online' ? 'رزرو آنلاین' : 'ثبت تلفنی / حضوری'}
              </p>
              <h1 className="mt-2 text-2xl font-extrabold">
                {a.status === 'confirmed' ? 'نوبت شما قطعی است' : 'این نوبت لغو شده است'}
              </h1>
              <p className="mt-3 text-sm leading-8">
                کد پیگیری <bdi className="break-all font-bold">{a.code}</bdi>
              </p>
              {a.cancellation_reason && (
                <p className="mt-3 text-sm leading-8">دلیل لغو: {a.cancellation_reason}</p>
              )}
            </header>
            <AppointmentSummary item={a} />
            {!business && remote.data && !remote.error && !remote.loading && (
              <CustomerAppointmentActions
                changes={remote.data}
                refresh={remote.reload}
              />
            )}
            {remote.data && <AppointmentHistory changes={remote.data} />}
            {business && a.status === 'confirmed' && !remote.error && !remote.loading && (
              <CancellationForm
                key={a.id + ':' + a.version}
                item={a}
                refresh={remote.reload}
              />
            )}
          </>
        )}
      </article>
    </>
  );
}
export function AppointmentDetailScreen({ id, business }: { id: string; business?: string }) {
  return (
    <AccountGate
      title="جزئیات نوبت"
      returnTo={business ? `/manage/${business}/appointments` : '/appointments/' + id}
    >
      <Detail
        id={id}
        {...(business ? { business } : {})}
      />
    </AccountGate>
  );
}
