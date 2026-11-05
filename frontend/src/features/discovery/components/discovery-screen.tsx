'use client';
import { useState } from 'react';
import { Brand } from '../../../components/ui/brand';
import { Icon } from '../../../components/ui/icon';
import { Button } from '../../../components/ui/button';
import { useDiscoveryFilters } from '../hooks/use-discovery-filters';
import { DiscoverySearch } from './discovery-search';
import { AudienceTabs } from './audience-tabs';
import { ServiceFilters } from './service-filters';
import { SalonResults } from './salon-results';
import { LocationSheet } from './location-sheet';
export function DiscoveryScreen() {
  const f = useDiscoveryFilters();
  const [locationOpen, setLocationOpen] = useState(false);
  const type = f.params.get('audience');
  const audience = type === 'men' || type === 'women' ? type : 'all';
  const locationLabel =
    [f.params.get('city'), f.params.get('district')].filter(Boolean).join('، ') || 'همه شهرها';
  return (
    <div className="flex flex-1 flex-col pb-8">
      <header className="px-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <button
            type="button"
            aria-label={`تغییر شهر و محله؛ انتخاب فعلی: ${locationLabel}`}
            className="inline-flex min-h-11 min-w-0 max-w-[62%] items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-semibold"
            onClick={() => setLocationOpen(true)}
          >
            <Icon
              name="pin"
              size={18}
            />
            <span className="truncate">{locationLabel}</span>
            <Icon
              name="chevron-down"
              size={16}
            />
          </button>
        </div>
        <h1 className="mt-7 text-[1.75rem] font-extrabold leading-relaxed">
          سالن دلخواهتان،
          <br />
          <span className="text-petrol">نوبت در چند قدم</span>
        </h1>
        <p className="mt-2 text-sm leading-7 text-ink-soft">
          خدمات و قیمت‌ها را ببینید، زمان مناسب را انتخاب کنید و نوبت بگیرید.
        </p>
        <DiscoverySearch
          query={f.search}
          onChange={f.setSearch}
        />
      </header>
      <AudienceTabs
        value={audience}
        onChange={(v) => f.update({ audience: v === 'all' ? null : v })}
      />
      {f.categories.data && (
        <ServiceFilters
          categories={f.categories.data}
          value={f.params.get('category')}
          onChange={(v) => f.update({ category: v })}
        />
      )}
      {Boolean(f.categories.error) && (
        <div className="px-5 pt-3">
          <p role="alert">دسته‌های خدمات بارگذاری نشدند.</p>
          <Button
            variant="ghost"
            onClick={() => void f.categories.reload()}
          >
            تلاش دوباره دسته‌ها
          </Button>
        </div>
      )}
      <section
        className="mt-6 space-y-4 px-5"
        aria-labelledby="results-title"
      >
        <h2
          id="results-title"
          className="text-lg font-extrabold"
        >
          سالن‌ها
        </h2>
        {f.results.loading ? (
          <p
            role="status"
            className="rounded-3xl bg-surface p-6"
          >
            در حال دریافت سالن‌ها…
          </p>
        ) : f.results.error ? (
          <div
            role="alert"
            className="space-y-3 rounded-3xl border border-line bg-surface p-5"
          >
            <p>دریافت سالن‌ها انجام نشد. ارتباط و فیلترهای نشانی را بررسی کنید.</p>
            <Button onClick={() => void f.results.reload()}>تلاش دوباره</Button>
            <Button
              variant="ghost"
              onClick={f.reset}
            >
              پاک کردن فیلترها
            </Button>
          </div>
        ) : (
          f.results.data && (
            <>
              <p
                aria-live="polite"
                className="text-sm text-muted"
              >
                {new Intl.NumberFormat('fa').format(f.results.data.items.length)} سالن در این صفحه
              </p>
              <SalonResults
                results={f.results.data.items}
                onReset={f.reset}
              />
            </>
          )
        )}
        <div className="flex flex-wrap gap-3">
          {f.results.data?.next_cursor && !f.results.loading && !f.results.error && (
            <Button onClick={f.next}>صفحه بعد</Button>
          )}
          {f.params.has('cursor') && (
            <Button
              variant="secondary"
              onClick={() => f.update({ cursor: null })}
            >
              صفحه اول
            </Button>
          )}
        </div>
      </section>
      {locationOpen &&
        (!f.locations.loading && !f.locations.error ? (
          <LocationSheet
            city={f.params.get('city') ?? ''}
            district={f.params.get('district') ?? ''}
            locations={f.locations.data ?? []}
            onClose={() => setLocationOpen(false)}
            onApply={(city, district) => {
              f.update({ city: city || null, district: district || null });
              setLocationOpen(false);
            }}
          />
        ) : (
          <div className="m-5 space-y-3 rounded-2xl border border-line p-4">
            <p role={f.locations.error ? 'alert' : 'status'}>
              {f.locations.error ? 'شهرها دریافت نشدند.' : 'در حال دریافت شهرها…'}
            </p>
            <Button onClick={() => void f.locations.reload()}>تلاش دوباره شهرها</Button>
            <Button
              variant="ghost"
              onClick={() => setLocationOpen(false)}
            >
              بستن
            </Button>
          </div>
        ))}
    </div>
  );
}
