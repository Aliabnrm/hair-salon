import Link from 'next/link';
import { Icon } from '../../../components/ui/icon';
import type { SalonSummary } from '../../public-catalog';
import { formatPrice } from '../../public-catalog';
export function SalonCard({ salon }: { salon: SalonSummary }) {
  return (
    <li>
      <Link
        href={`/salons/${salon.id}`}
        prefetch={false}
        className="group block overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-colors hover:border-petrol"
      >
        <div
          className={`flex min-h-28 items-center gap-4 p-5 ${salon.audience === 'women' ? 'bg-clay-soft' : 'bg-petrol-soft'}`}
        >
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface text-petrol">
            <Icon
              name="scissors"
              size={32}
            />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-ink-soft">
              {salon.audience === 'women' ? 'سالن زیبایی بانوان' : 'آرایشگاه مردانه'}
            </p>
            <h3 className="mt-2 break-words text-xl font-extrabold leading-8">{salon.name}</h3>
          </div>
        </div>
        <div className="p-4">
          <p className="flex items-start gap-2 leading-7 text-ink-soft">
            <Icon
              name="pin"
              size={18}
            />
            <span className="break-words">
              {salon.city}
              {salon.district ? `، ${salon.district}` : ''}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm text-ink-soft">
              خدمات از{' '}
              <strong className="text-base text-ink">{formatPrice(salon.min_price_irr)}</strong>
            </p>
            <span className="text-sm font-bold text-petrol">مشاهده سالن ←</span>
          </div>
        </div>
      </Link>
    </li>
  );
}
