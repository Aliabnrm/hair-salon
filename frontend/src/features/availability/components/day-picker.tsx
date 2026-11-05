'use client';
import { useEffect, useRef } from 'react';
import { Icon } from '../../../components/ui/icon';
import { monthDays } from '../model/selection';

export function DayPicker({
  first,
  last,
  selected,
  choose,
}: {
  first: string;
  last: string;
  selected: string;
  choose: (date: string) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = strip.current;
    const active = container?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!container || !active) return;
    const bounds = container.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    container.scrollLeft += item.left - bounds.left - (bounds.width - item.width) / 2;
  }, [selected]);
  return (
    <section
      aria-label="انتخاب روز"
      className="min-w-0 space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">روز مراجعه</h2>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="روزهای قبل"
            onClick={() => strip.current?.scrollBy({ left: 240, behavior: 'smooth' })}
            className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-petrol"
          >
            <Icon
              name="back"
              size={18}
            />
          </button>
          <button
            type="button"
            aria-label="روزهای بعد"
            onClick={() => strip.current?.scrollBy({ left: -240, behavior: 'smooth' })}
            className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-petrol"
          >
            <Icon
              name="forward"
              size={18}
            />
          </button>
        </div>
      </div>
      <div
        ref={strip}
        className="flex gap-2 overflow-x-auto px-1 pb-3 pt-1"
      >
        {monthDays(first, last)
          .flatMap((month) => month.dates)
          .map((day) => {
            const date = new Date(day.iso + 'T12:00:00Z');
            const active = selected === day.iso;
            return (
              <button
                key={day.iso}
                type="button"
                data-date={day.iso}
                aria-label={`${day.full}${day.iso === first ? '، امروز' : ''}`}
                aria-pressed={active}
                onClick={() => choose(day.iso)}
                className={`flex min-h-24 w-17 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border p-2 transition-colors ${active ? 'border-petrol bg-petrol text-white shadow-card' : 'border-line bg-surface text-ink hover:border-petrol'}`}
              >
                <span className={`text-xs ${active ? 'text-white/90' : 'text-muted'}`}>
                  {day.iso === first
                    ? 'امروز'
                    : new Intl.DateTimeFormat('fa-IR', {
                        weekday: 'short',
                        timeZone: 'Asia/Tehran',
                      }).format(date)}
                </span>
                <span className="text-xl font-extrabold">{day.label}</span>
                <span className="text-xs">
                  {new Intl.DateTimeFormat('fa-IR', {
                    month: 'long',
                    timeZone: 'Asia/Tehran',
                  }).format(date)}
                </span>
              </button>
            );
          })}
      </div>
    </section>
  );
}
