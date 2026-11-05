import Link from 'next/link';
import { Icon } from '../ui/icon';

export function PageHeader({
  title,
  backHref,
  backLabel,
}: {
  title: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur sm:px-6">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-line text-ink transition-colors hover:bg-sand"
      >
        <Icon name="back" />
      </Link>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-ink">{title}</p>
        <p className="text-xs leading-6 text-muted">{backLabel}</p>
      </div>
    </header>
  );
}
