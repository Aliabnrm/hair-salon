'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Button, buttonStyles } from '../../../components/ui/button';
import { Icon } from '../../../components/ui/icon';
import { PrivatePageHeader } from '../../../components/ui/private-page-header';
import { StatePanel } from '../../../components/ui/state-panel';
import { useSession } from '../hooks/use-session';
import { authFormError } from '../model/auth-form-errors';

export function AccountScreen() {
  const { user, status, refresh, signOut } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  async function logout() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await signOut();
    } catch (failure) {
      setError(authFormError(failure));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className="flex flex-1 flex-col">
      <PrivatePageHeader
        title="حساب کاربری"
        description="یک جای آشنا برای شما و سالن‌هایتان."
      />
      <div className="space-y-6 px-4 py-6 sm:px-6">
        {status === 'loading' ? (
          <div
            role="status"
            className="rounded-3xl border border-line bg-surface p-5"
          >
            <span className="sr-only">در حال بررسی نشست…</span>
            <div className="skeleton mb-4 size-14 rounded-2xl" />
            <div className="skeleton h-5 w-28 rounded-lg" />
            <div className="skeleton mt-3 h-5 w-3/4 rounded-lg" />
          </div>
        ) : status === 'error' ? (
          <StatePanel
            icon="wifi-off"
            title="حساب بارگذاری نشد"
            description="ارتباط را بررسی کنید و دوباره تلاش کنید."
            tone="danger"
          >
            <Button onClick={() => void refresh()}>تلاش دوباره</Button>
          </StatePanel>
        ) : user ? (
          <>
            <section
              aria-label="اطلاعات حساب"
              className="rounded-3xl border border-line bg-surface p-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sand text-petrol">
                  <Icon
                    name="user"
                    size={28}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-medium text-ink-soft">ایمیل حساب شما</h2>
                  <p
                    dir="ltr"
                    data-testid="account-email"
                    className="mt-1 break-all text-start text-base font-semibold leading-7 text-ink"
                  >
                    {user.email}
                  </p>
                </div>
              </div>
              <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-sm leading-7 text-ink-soft">
                <Icon
                  name={user.emailVerified ? 'check' : 'info'}
                  className="mt-1 text-petrol"
                  size={18}
                />
                {user.emailVerified
                  ? 'ایمیل تأیید شده است.'
                  : 'ایمیل تأیید نشده؛ امکان تأیید هنوز فعال نیست.'}
              </p>
            </section>
            <section aria-labelledby="salon-entry-title">
              <h2
                id="salon-entry-title"
                className="mb-3 text-lg font-bold"
              >
                فضای کاری شما
              </h2>
              <Link
                href="/manage"
                aria-label="مدیریت سالن‌های من"
                className="group flex items-center gap-3 rounded-3xl border border-petrol/20 bg-petrol-soft p-5 transition-colors hover:border-petrol"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-petrol text-white">
                  <Icon
                    name="scissors"
                    size={25}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-lg leading-8 text-petrol-deep">
                    مدیریت سالن‌های من
                  </strong>
                  <span className="mt-1 block text-sm leading-7 text-ink-soft">
                    مشخصات، خدمات، تیم و برنامه کاری سالن‌هایتان.
                  </span>
                </span>
                <Icon
                  name="forward"
                  className="text-petrol"
                />
              </Link>
            </section>
            <div className="border-t border-line pt-4">
              <Button
                variant="ghost"
                className="text-ink-soft"
                onClick={() => void logout()}
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? 'در حال خروج…' : 'خروج از حساب'}
              </Button>
              {pending && (
                <p
                  role="status"
                  className="sr-only"
                >
                  در حال خروج از حساب…
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="mt-2 text-sm leading-7 text-danger"
                >
                  {error}
                </p>
              )}
            </div>
          </>
        ) : (
          <StatePanel
            icon="user"
            title="خوش آمدید به آراسته"
            description="با حساب خود، سالن اضافه کنید و اطلاعات و برنامه کاری آن را یک‌جا مدیریت کنید."
          >
            <Link
              href="/sign-in"
              className={buttonStyles.primary}
            >
              ورود با ایمیل
            </Link>
            <Link
              href="/sign-up"
              className={buttonStyles.ghost}
            >
              ساخت حساب
            </Link>
          </StatePanel>
        )}
        <p className="text-sm leading-7 text-muted">
          سالن‌ها فعلاً خصوصی‌اند؛ رزرو و بازیابی رمز هنوز فعال نیستند.
        </p>
      </div>
    </div>
  );
}
