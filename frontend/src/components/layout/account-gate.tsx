'use client';
import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { useSession } from '../../features/identity/hooks/use-session';
import { Button, buttonStyles } from '../ui/button';
import { PrivatePageHeader } from '../ui/private-page-header';
import { StatePanel } from '../ui/state-panel';
import { Icon } from '../ui/icon';
import { PageActionBar } from './page-action-bar';
export function AccountGate({
  children,
  title = 'مدیریت سالن',
  returnTo = '/manage',
  guestDescription = 'برای ادامه با ایمیل و رمز وارد شوید؛ انتخاب شما پس از ورود در دسترس است.',
  guestContext,
  showHeader = true,
}: {
  children: ReactNode;
  title?: string;
  returnTo?: string;
  guestDescription?: string;
  guestContext?: ReactNode;
  showHeader?: boolean;
}) {
  const session = useSession();
  if (session.user && session.status === 'authenticated')
    return <Fragment key={session.user.id}>{children}</Fragment>;
  return (
    <div>
      {showHeader && (
        <PrivatePageHeader
          title={title}
          description="فضای شخصی شما برای پیگیری نوبت‌ها و مدیریت سالن."
          back={{ href: '/account', label: 'حساب کاربری' }}
        />
      )}
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
          <div className="space-y-4">
            {guestContext ? (
              <section className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-petrol-soft text-petrol">
                    <Icon name="user" />
                  </span>
                  <div>
                    <h2 className="font-bold leading-7">ورود به حساب لازم است</h2>
                    <p className="mt-1 text-sm leading-7 text-ink-soft">{guestDescription}</p>
                  </div>
                </div>
                <PageActionBar label="ورود برای رزرو">
                  <Link
                    className={buttonStyles.primary + ' w-full'}
                    href={'/sign-in?' + new URLSearchParams({ returnTo })}
                  >
                    ورود با ایمیل
                  </Link>
                </PageActionBar>
              </section>
            ) : (
              <StatePanel
                icon="user"
                title="ورود به حساب لازم است"
                description={guestDescription}
              >
                <Link
                  className={buttonStyles.primary}
                  href={'/sign-in?' + new URLSearchParams({ returnTo })}
                >
                  ورود با ایمیل
                </Link>
              </StatePanel>
            )}
            {guestContext}
          </div>
        )}
      </div>
    </div>
  );
}
