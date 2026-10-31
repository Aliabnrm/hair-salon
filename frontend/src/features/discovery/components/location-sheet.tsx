'use client';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Icon } from '../../../components/ui/icon';
import { Sheet } from '../../../components/ui/sheet';
import { cities } from '../data/demo-salons';
import { chipClass } from './service-filters';

export function LocationSheet({
  cityId,
  neighborhood,
  onClose,
  onApply,
}: {
  cityId: string;
  neighborhood: string;
  onClose: () => void;
  onApply: (cityId: string, neighborhood: string) => void;
}) {
  const [city, setCity] = useState(cityId);
  const [area, setArea] = useState(neighborhood);
  const selected = cities.find((c) => c.id === city);
  return (
    <Sheet
      open
      onClose={onClose}
      title="شهر و محله"
      footer={
        <Button className="w-full" onClick={() => onApply(city, area)}>
          نمایش سالن‌ها
        </Button>
      }
    >
      <p className="mb-3 text-sm font-bold text-ink-soft">شهر</p>
      <div
        aria-label="انتخاب شهر"
        className="grid grid-cols-2 gap-2"
        role="group"
      >
        {cities.map((c) => (
          <button
            aria-pressed={city === c.id}
            className={`flex h-14 items-center justify-between rounded-2xl border px-4 text-base font-bold transition-colors ${city === c.id ? 'border-petrol bg-petrol-soft text-petrol-deep' : 'border-line bg-surface text-ink hover:border-line-strong'}`}
            key={c.id}
            onClick={() => {
              setCity(c.id);
              setArea('all');
            }}
            type="button"
          >
            {c.name}
            {city === c.id && <Icon name="check" size={18} />}
          </button>
        ))}
      </div>
      <p className="mb-3 mt-6 text-sm font-bold text-ink-soft">
        محله در {selected?.name}
      </p>
      <div
        aria-label="انتخاب محله"
        className="flex flex-wrap gap-2"
        role="group"
      >
        {['all', ...(selected?.neighborhoods ?? [])].map((n) => (
          <button
            aria-pressed={area === n}
            className={chipClass(area === n)}
            key={n}
            onClick={() => setArea(n)}
            type="button"
          >
            {n === 'all' ? 'همه محله‌ها' : n}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
