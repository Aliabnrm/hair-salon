import { Button } from '../../../components/ui/button';
import { StatePanel } from '../../../components/ui/state-panel';
import type { CategoryId, DemoSalon } from '../model/discovery.types';
import { SalonCard } from './salon-card';
export function SalonResults({
  results,
  category,
  city,
  onSelect,
  onReset,
  onLocation,
}: {
  results: DemoSalon[];
  category: CategoryId | null;
  city: string;
  onSelect: (salon: DemoSalon) => void;
  onReset: () => void;
  onLocation: () => void;
}) {
  return (
    <section aria-labelledby="results-title" className="mt-6 px-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink" id="results-title">
          سالن‌های پیشنهادی
        </h2>
        <p aria-live="polite" className="text-sm text-muted">
          {new Intl.NumberFormat('fa-IR').format(results.length)} نتیجه
        </p>
      </div>
      {results.length ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {results.map((s) => (
            <SalonCard
              key={s.id}
              salon={s}
              category={category}
              onSelect={() => onSelect(s)}
            />
          ))}
        </ul>
      ) : (
        <StatePanel
          description={`با این فیلترها در ${city} سالنی پیدا نشد. محله یا خدمت دیگری را امتحان کنید.`}
          icon="search"
          title="نتیجه‌ای پیدا نشد"
        >
          <Button className="w-full" onClick={onReset}>
            پاک کردن فیلترها
          </Button>
          <Button variant="secondary" className="w-full" onClick={onLocation}>
            تغییر شهر یا محله
          </Button>
        </StatePanel>
      )}
    </section>
  );
}
