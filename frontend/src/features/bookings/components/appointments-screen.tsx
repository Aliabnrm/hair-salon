'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AccountGate } from '../../../components/layout/account-gate';
import { Button, buttonStyles } from '../../../components/ui/button';
import { appointmentPage } from '../api/bookings.api';
import { useBookingResource } from '../hooks/use-booking-resource';
import { AppointmentCard } from './appointment-card';
import { BookingFeedback } from './booking-feedback';
function MyAppointments() {
  const [period, setPeriod] = useState<'upcoming' | 'past'>('upcoming'),
    [cursor, setCursor] = useState<string | null>(null);
  const q = new URLSearchParams({ period });
  if (cursor) q.set('cursor', cursor);
  const remote = useBookingResource('mine:' + q, (signal) => appointmentPage(q, signal));
  return (
    <article className="space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-extrabold">نوبت‌های من</h1>
        <p className="mt-2 text-sm leading-7 text-ink-soft">
          زمان مراجعه، جزئیات و کد پیگیری رزروهایتان.
        </p>
      </header>
      <div
        className="flex flex-wrap gap-2"
        aria-label="بازه نوبت‌ها"
      >
        {(['upcoming', 'past'] as const).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'primary' : 'secondary'}
            aria-pressed={period === p}
            onClick={() => {
              setPeriod(p);
              setCursor(null);
            }}
          >
            {p === 'upcoming' ? 'آینده' : 'گذشته'}
          </Button>
        ))}
        <Button
          variant="ghost"
          onClick={() => void remote.reload()}
        >
          تازه‌سازی
        </Button>
      </div>
      <BookingFeedback
        error={remote.error}
        loading={remote.loading}
        retry={() => void remote.reload()}
      />
      {remote.data?.items.map((a) => (
        <AppointmentCard
          key={a.id}
          item={a}
        />
      ))}
      {remote.data && !remote.data.items.length && !remote.error && !remote.loading && (
        <section className="rounded-3xl border border-line bg-surface p-6 text-center leading-8">
          <h2 className="text-lg font-bold">در این بازه نوبتی ندارید</h2>
          <p className="my-3 text-sm text-ink-soft">
            پس از ثبت نهایی، رسید شما اینجا در دسترس است.
          </p>
          <Link
            href="/"
            className={buttonStyles.primary}
          >
            پیداکردن سالن
          </Link>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        {cursor && (
          <Button
            variant="secondary"
            onClick={() => setCursor(null)}
          >
            ابتدای فهرست
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
      <aside className="border-t border-line pt-3 text-sm text-muted">
        صاحب سالن هستید؟{' '}
        <Link
          href="/manage"
          className={buttonStyles.ghost}
        >
          مدیریت نوبت‌های مشتریان
        </Link>
      </aside>
    </article>
  );
}
export function AppointmentsScreen() {
  return (
    <AccountGate
      title="نوبت‌های من"
      returnTo="/appointments"
    >
      <MyAppointments />
    </AccountGate>
  );
}
