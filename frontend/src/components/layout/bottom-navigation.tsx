'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon, type IconName } from '../ui/icon';
import { Sheet } from '../ui/sheet';
import { StatePanel } from '../ui/state-panel';
import { Button } from '../ui/button';

const itemClass =
  'relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold transition-colors';
function NavContent({
  label,
  icon,
  active,
}: {
  label: string;
  icon: IconName;
  active: boolean;
}) {
  return (
    <>
      {active && (
        <span className="absolute top-0 h-0.5 w-10 rounded-full bg-petrol" />
      )}
      <Icon name={icon} size={22} />
      {label}
    </>
  );
}
export function BottomNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <nav
        aria-label="ناوبری اصلی"
        className="grid shrink-0 grid-cols-3 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={`${itemClass} ${pathname === '/' ? 'text-petrol' : 'text-muted hover:text-ink'}`}
        >
          <NavContent label="کاوش" icon="search" active={pathname === '/'} />
        </Link>
        <button
          type="button"
          className={`${itemClass} text-muted hover:text-ink`}
          onClick={() => setOpen(true)}
        >
          <NavContent label="نوبت‌های من" icon="ticket" active={false} />
        </button>
        <Link
          href="/account"
          aria-current={pathname === '/account' ? 'page' : undefined}
          className={`${itemClass} ${pathname === '/account' ? 'text-petrol' : 'text-muted hover:text-ink'}`}
        >
          <NavContent
            label="حساب"
            icon="user"
            active={pathname === '/account'}
          />
        </Link>
      </nav>
      <Sheet open={open} onClose={() => setOpen(false)} title="نوبت‌های من">
        <StatePanel
          icon="calendar"
          title="رزرو هنوز فعال نیست"
          description="در این نسخه فقط کشف سالن‌های نمونه و حساب کاربری فعال است. هیچ نوبتی ثبت یا ذخیره نمی‌شود."
        >
          <Button onClick={() => setOpen(false)}>متوجه شدم</Button>
        </StatePanel>
      </Sheet>
    </>
  );
}
