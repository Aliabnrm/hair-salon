'use client';
import { useState } from 'react';
import { Brand } from '../../../components/ui/brand';
import { Icon } from '../../../components/ui/icon';
import { Button } from '../../../components/ui/button';
import { Sheet } from '../../../components/ui/sheet';
import { StatePanel } from '../../../components/ui/state-panel';
import { useDiscoveryFilters } from '../hooks/use-discovery-filters';
import type { DemoSalon } from '../model/discovery.types';
import { DiscoverySearch } from './discovery-search';
import { AudienceTabs } from './audience-tabs';
import { ServiceFilters } from './service-filters';
import { SalonResults } from './salon-results';
import { LocationSheet } from './location-sheet';

export function DiscoveryScreen() {
  const { filters, update, city, locationLabel, visibleCategories, results } =
    useDiscoveryFilters();
  const [locationOpen, setLocationOpen] = useState(false);
  const [selected, setSelected] = useState<DemoSalon | null>(null);
  return (
    <div className="flex flex-1 flex-col pb-8">
      <header className="px-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <button
            aria-label={`تغییر شهر و محله؛ انتخاب فعلی: ${locationLabel}`}
            className="inline-flex h-11 min-w-0 max-w-[62%] items-center gap-1.5 rounded-full border border-line bg-surface pe-2.5 ps-3 text-sm font-semibold text-ink transition-colors hover:border-line-strong"
            onClick={() => setLocationOpen(true)}
            type="button"
          >
            <Icon className="text-petrol" name="pin" size={18} />
            <span className="truncate">{locationLabel}</span>
            <Icon className="text-muted" name="chevron-down" size={16} />
          </button>
        </div>
        <h1 className="mt-7 text-[1.75rem] font-extrabold leading-[1.5] text-ink">
          نوبت بعدی‌تان را
          <br />
          <span className="text-petrol">آسان و بی‌انتظار</span> رزرو کنید
        </h1>
        <p className="mt-2 text-sm leading-7 text-ink-soft">
          سالن‌ها، قیمت‌ها و ساعت‌ها نمایشی‌اند؛ رزرو هنوز فعال نیست.
        </p>
        <DiscoverySearch
          query={filters.query}
          onChange={(query) => update({ query })}
        />
      </header>
      <AudienceTabs
        value={filters.type}
        onChange={(type) => update({ type })}
      />
      <ServiceFilters
        categories={visibleCategories}
        value={filters.category}
        onChange={(category) => update({ category })}
      />
      <SalonResults
        results={results}
        category={filters.category}
        city={city.name}
        onSelect={setSelected}
        onLocation={() => setLocationOpen(true)}
        onReset={() =>
          update({
            neighborhood: 'all',
            category: null,
            type: 'all',
            query: '',
          })
        }
      />
      {locationOpen && (
        <LocationSheet
          cityId={filters.cityId}
          neighborhood={filters.neighborhood}
          onClose={() => setLocationOpen(false)}
          onApply={(cityId, neighborhood) => {
            update({ cityId, neighborhood });
            setLocationOpen(false);
          }}
        />
      )}
      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? 'سالن نمونه'}
      >
        <StatePanel
          icon="info"
          title="این سالن نمونه است"
          description="اطلاعات این صفحه از طرح نمایشی آمده‌اند. رزرو، زمان آزاد و ارتباط با سالن هنوز فعال نیستند."
        >
          <Button onClick={() => setSelected(null)}>بازگشت به سالن‌ها</Button>
        </StatePanel>
      </Sheet>
    </div>
  );
}
