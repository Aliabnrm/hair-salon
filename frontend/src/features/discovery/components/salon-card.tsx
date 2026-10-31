import { Icon } from '../../../components/ui/icon';
import type { DemoSalon, CategoryId } from '../model/discovery.types';
import { startingPrice } from '../model/filter-salons';

export function SalonCard({
  salon,
  category,
  onSelect,
}: {
  salon: DemoSalon;
  category: CategoryId | null;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        className="group block w-full overflow-hidden rounded-3xl border border-line bg-surface text-start shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
        onClick={onSelect}
        type="button"
        aria-label={`نمایش سالن نمونه ${salon.name}`}
      >
        <span className="relative block h-40 overflow-hidden bg-sand">
          <img
            alt={salon.imageAlt}
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            width={900}
            height={640}
            src={salon.image}
          />
          <span className="absolute start-3 top-3">
            <span
              className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold ${salon.type === 'men' ? 'bg-petrol-soft text-petrol-deep' : 'bg-clay-soft text-clay'}`}
            >
              <Icon
                name={salon.type === 'men' ? 'scissors' : 'sparkle'}
                size={14}
              />
              {salon.type === 'men' ? 'آرایشگاه مردانه' : 'سالن زیبایی بانوان'}
            </span>
          </span>
        </span>
        <span className="block p-4">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-lg font-extrabold text-ink">
                {salon.name}
              </span>
              <span className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
                <Icon name="pin" size={15} />
                {salon.neighborhood}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-petrol-soft px-2.5 py-1 text-sm font-bold text-petrol-deep">
              <Icon name="clock" size={14} />
              {salon.hours}
            </span>
          </span>
          <span className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
            <span className="text-sm text-ink-soft">
              از{' '}
              <strong className="text-base font-extrabold text-ink">
                {startingPrice(salon, category)}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted">
              <Icon name="info" size={14} />
              داده نمایشی
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}
