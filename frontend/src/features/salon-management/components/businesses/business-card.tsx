import Link from 'next/link';
import { Icon } from '../../../../components/ui/icon';
import type { Business } from '../../model/management.types';
import { DraftBadge } from './draft-badge';
export function BusinessCard({ business }: { business: Business }) {
  return (
    <li>
      <Link
        href={`/manage/${business.id}`}
        className="group block rounded-3xl border border-line bg-surface p-4 transition-colors hover:border-petrol sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-2xl border border-petrol/10 bg-petrol-soft text-petrol"
          >
            <Icon
              name="scissors"
              size={28}
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-bold leading-8 text-ink">{business.name}</h2>
            <p className="mt-1 flex items-start gap-1 text-sm leading-7 text-ink-soft">
              <Icon
                name="pin"
                size={16}
                className="mt-1"
              />
              <span className="min-w-0 break-words">
                {business.city}
                {business.district ? `، ${business.district}` : ''}
              </span>
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-sm text-ink-soft">
            {business.audience === 'women' ? 'سالن زنانه' : 'سالن مردانه'}
          </span>
          <DraftBadge state={business.state} />
          <span className="ms-auto inline-flex items-center gap-1 text-sm font-bold text-petrol">
            مدیریت
            <Icon
              name="forward"
              size={18}
            />
          </span>
        </div>
      </Link>
    </li>
  );
}
export function BusinessListSkeleton() {
  return (
    <div
      role="status"
      className="space-y-3"
    >
      <span className="sr-only">در حال بارگذاری سالن‌ها…</span>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          aria-hidden="true"
          className="rounded-3xl border border-line bg-surface p-5"
        >
          <div className="flex gap-3">
            <div className="skeleton size-14 rounded-2xl" />
            <div className="flex-1">
              <div className="skeleton h-6 w-2/3 rounded-lg" />
              <div className="skeleton mt-3 h-4 w-1/2 rounded-lg" />
            </div>
          </div>
          <div className="skeleton mt-4 h-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
