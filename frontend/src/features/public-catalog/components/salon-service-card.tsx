import Link from 'next/link';
import { Icon } from '../../../components/ui/icon';
import type { PublicProfile } from '../model/catalog.types';
import { formatPrice } from '../model/format-price';

export function SalonServiceCard({
  service,
  href,
}: {
  service: PublicProfile['services'][number];
  href: string | null;
}) {
  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-bold leading-7">{service.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Icon
              name="clock"
              size={15}
            />
            {service.duration_minutes.toLocaleString('fa-IR')} دقیقه
          </p>
        </div>
        <strong className="text-sm leading-7 text-ink">{formatPrice(service.price_irr)}</strong>
      </div>
      {href && (
        <span className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm font-bold text-petrol">
          انتخاب زمان{' '}
          <Icon
            name="forward"
            size={18}
          />
        </span>
      )}
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          aria-label={`انتخاب زمان برای ${service.name}`}
          className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-petrol"
        >
          {content}
        </Link>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-4">{content}</div>
      )}
    </li>
  );
}
