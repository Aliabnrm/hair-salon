'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Button, buttonStyles } from '../../../components/ui/button';
import { Icon } from '../../../components/ui/icon';
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
    <div className="flex flex-1 flex-col space-y-5 px-5 pb-8 pt-6">
      <h1 className="text-2xl font-extrabold text-ink">حساب کاربری</h1>
      {status === 'loading' ? (
        <p role="status" className="text-sm text-ink-soft">
          در حال بررسی نشست…
        </p>
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
        <section className="rounded-3xl border border-line bg-surface p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-petrol-soft text-petrol">
              <Icon name="user" />
            </span>
            <div className="min-w-0">
              <h2 className="font-bold text-ink">وارد شده‌اید</h2>
              <p
                dir="ltr"
                data-testid="account-email"
                className="mt-1 break-all text-sm text-ink-soft"
              >
                {user.email}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted">
            {user.emailVerified
              ? 'ایمیل تأیید شده است.'
              : 'مالکیت ایمیل تأیید نشده است. تأیید ایمیل هنوز فعال نیست.'}
          </p>
          <Button
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => void logout()}
            disabled={pending}
          >
            {pending ? 'در حال خروج…' : 'خروج از حساب'}
          </Button>
          {error && (
            <p role="alert" className="mt-3 text-sm leading-7 text-danger">
              {error}
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-bold text-ink">ورود اختیاری است</h2>
          <p className="mt-1 text-sm leading-7 text-ink-soft">
            برای جستجو و دیدن قیمت‌های نمونه نیازی به ورود نیست. حساب شما با
            ایمیل و رمز در دسترس است.
          </p>
          <Link
            href="/sign-in"
            className={`${buttonStyles.secondary} mt-4 w-full`}
          >
            ورود با ایمیل
          </Link>
          <Link href="/sign-up" className={`${buttonStyles.ghost} mt-2 w-full`}>
            ساخت حساب
          </Link>
        </section>
      )}
      <p className="text-xs leading-6 text-muted">
        رزرو، پیامک، بازیابی رمز و تأیید ایمیل هنوز فعال نیستند.
      </p>
    </div>
  );
}
