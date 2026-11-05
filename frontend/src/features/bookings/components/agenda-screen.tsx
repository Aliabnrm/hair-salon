'use client';
import { SelectControl } from '../../../components/ui/select-control';
import { useState } from 'react';
import Link from 'next/link';
import { Button, buttonStyles } from '../../../components/ui/button';
import { AccountGate } from '../../../components/layout/account-gate';
import { allStaff, getBusiness } from '../../salon-management';
import { inDays, persianDate } from '../../../lib/format/local-date';
import { tehranDate, appointmentTime } from '../model/booking-values';
import { useBookingResource } from '../hooks/use-booking-resource';
import { appointmentPage } from '../api/bookings.api';
import { BookingFeedback } from './booking-feedback';
import { AppointmentCard } from './appointment-card';
function DailyAgenda({ business }: { business: string }) {
  const [date, setDate] = useState(tehranDate()),
    [staff, setStaff] = useState('any'),
    [cursor, setCursor] = useState<string | null>(null);
  const catalog = useBookingResource('agenda-catalog:' + business, async (signal) => {
    const [salon, staff] = await Promise.all([
      getBusiness(business, signal),
      allStaff(business, signal),
    ]);
    return { salon, staff };
  });
  const q = new URLSearchParams({ date, staff_id: staff });
  if (cursor) q.set('cursor', cursor);
  const remote = useBookingResource(`agenda:${business}:${q}`, (signal) =>
    appointmentPage(q, signal, business),
  );
  function changeDate(next: string) {
    setDate(next);
    setCursor(null);
  }
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
      <section
        className="space-y-4 rounded-3xl border border-line bg-surface p-4"
        aria-label="فیلتر دفتر نوبت‌ها"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => changeDate(inDays(date, -1))}
          >
            روز قبل
          </Button>
          <h2 className="font-bold">{persianDate(date)}</h2>
          <Button
            variant="ghost"
            onClick={() => changeDate(inDays(date, 1))}
          >
            روز بعد
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => changeDate(tehranDate())}
          >
            امروز
          </Button>
          <Button
            variant="secondary"
            onClick={() => void remote.reload()}
          >
            تازه‌سازی نوبت‌ها
          </Button>
        </div>
        <label className="block text-sm font-bold">
          متخصص
          <SelectControl
            containerClassName="mt-2"
            className="h-14 rounded-2xl border border-line-strong bg-surface text-base"
            value={staff}
            onChange={(e) => {
              setStaff(e.target.value);
              setCursor(null);
            }}
          >
            <option value="any">همه متخصصان</option>
            {catalog.data?.staff.map((s) => (
              <option
                key={s.id}
                value={s.id}
              >
                {s.display_name}
                {s.active ? '' : ' (غیرفعال)'}
              </option>
            ))}
          </SelectControl>
        </label>
        {remote.updatedAt && (
          <p className="text-xs leading-7 text-muted">
            آخرین دریافت موفق: {appointmentTime(remote.updatedAt)} · با بازگشت به صفحه تازه می‌شود.
          </p>
        )}
      </section>
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
          <h2 className="font-bold">برای این روز و متخصص نوبتی ثبت نشده</h2>
          <p className="mt-2 text-sm text-ink-soft">
            روز یا متخصص دیگری را انتخاب کنید یا نوبت تلفنی ثبت کنید.
          </p>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        {cursor && (
          <Button
            variant="secondary"
            onClick={() => setCursor(null)}
          >
            ابتدای روز
          </Button>
        )}
        {remote.data?.next_cursor && (
          <Button
            variant="secondary"
            onClick={() => setCursor(remote.data?.next_cursor ?? null)}
          >
            نوبت‌های بیشتر
          </Button>
        )}
      </div>
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
