'use client';
import { useAgenda } from '../hooks/use-agenda';
import { AgendaFilters } from './agenda-filters';
import { AgendaSummary } from './agenda-summary';
import { ScheduleBlocks } from './schedule-blocks';
import Link from 'next/link';
import { Button, buttonStyles } from '../../../components/ui/button';
import { AccountGate } from '../../../components/layout/account-gate';
import { BookingFeedback } from './booking-feedback';
import { AppointmentCard } from './appointment-card';
function DailyAgenda({ business }: { business: string }) {
  const agenda = useAgenda(business);
  const { date, cursor, catalog, remote } = agenda;
  return (
    <article className="space-y-5 p-4 sm:p-6">
      <header className="rounded-3xl border border-petrol/15 bg-petrol-soft p-5">
        <p className="text-sm font-bold text-petrol">دفتر روزانه {catalog.data?.salon.name}</p>
        <h1 className="mt-2 text-2xl font-extrabold">نوبت‌های سالن</h1>
        <p className="mt-3 text-sm leading-8 text-ink-soft">
          نوبت‌های روز را ببینید یا برای مراجعه‌کننده نوبت ثبت کنید.
        </p>
        <Link
          className={buttonStyles.ghost + ' mt-2'}
          href={`/manage/${business}`}
        >
          وضعیت دریافت رزرو و مشخصات سالن
        </Link>
        <Link
          className={buttonStyles.primary + ' mt-4 w-full'}
          href={`/manage/${business}/appointments/new`}
        >
          ثبت نوبت تلفنی / حضوری
        </Link>
      </header>
      <AgendaFilters agenda={agenda} />
      <BookingFeedback
        error={catalog.error}
        loading={catalog.loading}
        retry={() => void catalog.reload()}
      />
      <BookingFeedback
        error={remote.error}
        loading={remote.loading}
        retry={() => void remote.reload()}
      />
      {remote.data && <AgendaSummary summary={remote.data.summary} />}
      <div
        className="space-y-3"
        aria-label="فهرست نوبت‌ها"
      >
        {remote.data?.items.map((a) => (
          <AppointmentCard
            key={a.id}
            item={a}
            owner
          />
        ))}
      </div>
      {remote.data && !remote.data.items.length && !remote.error && !remote.loading && (
        <section className="rounded-3xl bg-surface p-6 text-center leading-8">
          <h2 className="font-bold">برای این بازه و فیلتر نوبتی پیدا نشد</h2>
          <p className="mt-2 text-sm text-ink-soft">
            روز یا متخصص دیگری را انتخاب کنید یا نوبت تلفنی ثبت کنید.
          </p>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        {cursor && (
          <Button
            variant="secondary"
            onClick={() => agenda.setCursor(null)}
          >
            ابتدای روز
          </Button>
        )}
        {remote.data?.next_cursor && (
          <Button
            variant="secondary"
            onClick={() => agenda.setCursor(remote.data?.next_cursor ?? null)}
          >
            نوبت‌های بیشتر
          </Button>
        )}
      </div>
      {remote.data && (
        <ScheduleBlocks
          key={business}
          business={business}
          date={date}
          staff={catalog.data?.staff ?? []}
          overview={remote.data}
          refresh={remote.reload}
          stale={remote.loading || Boolean(remote.error)}
        />
      )}
    </article>
  );
}
export function AgendaScreen({ business }: { business: string }) {
  return (
    <AccountGate
      title="دفتر نوبت‌های سالن"
      returnTo={`/manage/${business}/appointments`}
    >
      <DailyAgenda business={business} />
    </AccountGate>
  );
}
