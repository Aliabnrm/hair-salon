'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from '../../../components/ui/icon';
import { safeReturnTo } from '../model/return-to';

export function AuthBackLink() {
  const returnTo = safeReturnTo(useSearchParams().get('returnTo'));
  const signingUp = usePathname() === '/sign-up';
  const href = signingUp ? '/sign-in?' + new URLSearchParams({ returnTo }) : returnTo;
  const label = signingUp
    ? 'بازگشت به ورود'
    : returnTo.startsWith('/salons/')
      ? 'بازگشت به رزرو'
      : returnTo.startsWith('/manage')
        ? 'بازگشت به مدیریت'
        : returnTo.startsWith('/appointments')
          ? 'بازگشت به نوبت‌ها'
          : 'بازگشت به حساب';
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-petrol hover:bg-sand"
    >
      <Icon
        name="back"
        size={18}
      />
      {label}
    </Link>
  );
}
