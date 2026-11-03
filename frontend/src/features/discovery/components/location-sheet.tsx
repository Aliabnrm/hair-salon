'use client';
import { useState } from 'react';
import { Sheet } from '../../../components/ui/sheet';
import { Button } from '../../../components/ui/button';
import type { Location } from '../../public-catalog';
import { chipClass } from './service-filters';
export function LocationSheet({
  city,
  district,
  locations,
  onClose,
  onApply,
}: {
  city: string;
  district: string;
  locations: Location[];
  onClose: () => void;
  onApply: (city: string, district: string) => void;
}) {
  const [selected, setSelected] = useState(city),
    [area, setArea] = useState(district);
  const current = locations.find((c) => c.city === selected);
  return (
    <Sheet
      open
      onClose={onClose}
      title="شهر و محله"
      footer={
        <Button
          className="w-full"
          onClick={() => onApply(selected, area)}
        >
          نمایش سالن‌ها
        </Button>
      }
    >
      <p className="mb-3 font-bold">شهر</p>
      <div className="flex flex-wrap gap-2">
        <button
          className={chipClass(!selected)}
          aria-pressed={!selected}
          onClick={() => {
            setSelected('');
            setArea('');
          }}
        >
          همه شهرها
        </button>
        {locations.map((c) => (
          <button
            key={c.city}
            className={chipClass(selected === c.city)}
            aria-pressed={selected === c.city}
            onClick={() => {
              setSelected(c.city);
              setArea('');
            }}
          >
            {c.city}
          </button>
        ))}
      </div>
      {!locations.length && (
        <p className="my-4 leading-8 text-muted">
          هنوز سالنی منتشر نشده است؛ پس از انتشار، شهرهای واقعی اینجا نمایش داده می‌شوند.
        </p>
      )}
      {current && (
        <>
          <p className="mb-3 mt-6 font-bold">محله در {current.city}</p>
          <div className="flex flex-wrap gap-2">
            {['', ...current.districts].map((d) => (
              <button
                key={d}
                className={chipClass(area === d)}
                aria-pressed={area === d}
                onClick={() => setArea(d)}
              >
                {d || 'همه محله‌ها'}
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
