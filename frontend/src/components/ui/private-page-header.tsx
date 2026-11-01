import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './icon';

export function PrivatePageHeader({
  title,
  description,
  back,
  children,
}: {
  title: string;
  description: string;
  back?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <header className="bg-petrol-deep px-5 pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white sm:px-6">
      <div className="mb-5 flex min-h-11 flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2.5 font-bold">
          <span className="grid size-9 place-items-center rounded-xl bg-surface">
            <img
              src="/assets/brand-mark.svg"
              width={26}
              height={26}
              alt=""
            />
          </span>
          آراسته
        </span>
        {back ? (
          <Link
            href={back.href}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-medium hover:bg-white/10 focus-visible:outline-white"
          >
            <Icon
              name="back"
              size={18}
            />
            {back.label}
          </Link>
        ) : (
          <span className="text-xs text-white/80">فضای شخصی شما</span>
        )}
      </div>
      <h1 className="break-words text-[1.625rem] font-extrabold leading-relaxed">{title}</h1>
      <p className="mt-1 break-words text-sm leading-7 text-white/90">{description}</p>
      {children}
    </header>
  );
}
