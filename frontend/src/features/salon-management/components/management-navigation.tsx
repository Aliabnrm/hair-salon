'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Icon } from '../../../components/ui/icon';
export function ManagementNavigation({
  businessId,
  embedded = false,
}: {
  businessId: string;
  embedded?: boolean;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const root = `/manage/${businessId}`;
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const revealActive = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) return;
      const box = nav.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      if (item.left < box.left || item.right > box.right)
        nav.scrollLeft += item.left - box.left - 12;
    };
    revealActive();
    const resize = new ResizeObserver(revealActive);
    resize.observe(nav);
    return () => resize.disconnect();
  }, [pathname]);
  // The settings screen places the same navigation after its real salon header.
  if (!embedded && pathname === root) return null;
  return (
    <div className="min-w-0 border-b border-line bg-surface">
      {!embedded && (
        <div className="px-4 pt-3 sm:px-6">
          <Link
            href="/manage"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-petrol"
          >
            <Icon
              name="back"
              size={18}
            />
            سالن‌های من
          </Link>
          <p className="pb-2 text-sm leading-7 text-muted">
            ویرایش تازه نیاز به بررسی انتشار مجدد دارد؛ رزرو هنوز فعال نیست.
          </p>
        </div>
      )}
      <nav
        ref={navRef}
        aria-label="مدیریت سالن"
        className="flex gap-1 overflow-x-auto px-4 py-2 sm:px-6"
      >
        {[
          ['', 'مشخصات'],
          ['services', 'خدمات'],
          ['staff', 'متخصصان'],
          ['hours', 'ساعات کاری'],
          ['exceptions', 'تعطیلی‌ها'],
          ['publication', 'انتشار'],
        ].map(([path, label]) => {
          const href = `${root}${path ? '/' + path : ''}`;
          const active = pathname === href;
          return (
            <Link
              key={path}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border-b-2 px-3 text-sm font-bold transition-colors ${active ? 'border-petrol bg-petrol-soft text-petrol-deep' : 'border-transparent text-ink-soft hover:bg-sand'}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
