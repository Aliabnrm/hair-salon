'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '../ui/icon';

const itemClass =
  'relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold transition-colors';
function NavContent({ label, icon, active }: { label: string; icon: IconName; active: boolean }) {
  return (
    <>
      {active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-petrol" />}
      <Icon
        name={icon}
        size={22}
      />
      {label}
    </>
  );
}
export function BottomNavigation() {
  const pathname = usePathname();
  const appointmentsActive = pathname === '/appointments' || pathname.startsWith('/appointments/');
  const accountActive =
    pathname === '/account' || pathname === '/manage' || pathname.startsWith('/manage/');
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
          <NavContent
            label="کاوش"
            icon="search"
            active={pathname === '/'}
          />
        </Link>
        <Link
          href="/appointments"
          aria-current={appointmentsActive ? 'page' : undefined}
          className={`${itemClass} ${appointmentsActive ? 'text-petrol' : 'text-muted hover:text-ink'}`}
        >
          <NavContent
            label="نوبت‌های من"
            icon="ticket"
            active={appointmentsActive}
          />
        </Link>
        <Link
          href="/account"
          aria-current={accountActive ? 'page' : undefined}
          className={`${itemClass} ${accountActive ? 'text-petrol' : 'text-muted hover:text-ink'}`}
        >
          <NavContent
            label="حساب"
            icon="user"
            active={accountActive}
          />
        </Link>
      </nav>
    </>
  );
}
