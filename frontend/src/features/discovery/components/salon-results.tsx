import { Button } from '../../../components/ui/button';
import { StatePanel } from '../../../components/ui/state-panel';
import type { SalonSummary } from '../../public-catalog';
import { SalonCard } from './salon-card';
export function SalonResults({
  results,
  onReset,
}: {
  results: SalonSummary[];
  onReset: () => void;
}) {
  return results.length ? (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {results.map((s) => (
        <SalonCard
          key={s.id}
          salon={s}
        />
      ))}
    </ul>
  ) : (
    <StatePanel
      icon="search"
      title="سالنی پیدا نشد"
      description="هنوز سالنی با این فیلترها منتشر نشده است. شهر یا خدمت دیگری را امتحان کنید."
    >
      <Button onClick={onReset}>پاک کردن فیلترها</Button>
    </StatePanel>
  );
}
