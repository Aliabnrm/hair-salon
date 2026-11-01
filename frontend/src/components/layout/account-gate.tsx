'use client';
import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { useSession } from '../../features/identity/hooks/use-session';
import { Button, buttonStyles } from '../ui/button';
import { PrivatePageHeader } from '../ui/private-page-header';
import { StatePanel } from '../ui/state-panel';
export function AccountGate({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session.user && session.status === 'authenticated')
    return <Fragment key={session.user.id}>{children}</Fragment>;
  return (
    <div>
      <PrivatePageHeader
        title="مدیریت سالن"
        description="فضای شخصی شما برای رسیدگی به سالن‌هایتان."
        back={{ href: '/account', label: 'حساب کاربری' }}
      />
      <div className="px-4 py-6 sm:px-6">
        {session.status === 'loading' ? (
          <div
            role="status"
            className="rounded-3xl border border-line bg-surface p-5"
          >
            <div
              aria-hidden="true"
              className="skeleton mb-4 h-14 rounded-2xl"
            />
            <p className="text-sm text-ink-soft">در حال بررسی حساب…</p>
          </div>
        ) : session.status === 'error' ? (
          <StatePanel
            icon="wifi-off"
            title="حساب بارگذاری نشد"
            description="ارتباط را بررسی کنید و دوباره تلاش کنید."
            tone="danger"
          >
            <Button onClick={() => void session.refresh()}>تلاش دوباره</Button>
          </StatePanel>
        ) : (
          <StatePanel
            icon="user"
            title="ورود به حساب لازم است"
            description="برای دیدن سالن‌های خود با ایمیل و رمز وارد شوید."
          >
            <Link
              className={buttonStyles.primary}
              href="/sign-in"
            >
              ورود با ایمیل
            </Link>
          </StatePanel>
        )}
      </div>
    </div>
  );
}
