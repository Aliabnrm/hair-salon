import type { DiscoveryFilters } from '../model/discovery.types';
export function AudienceTabs({
  value,
  onChange,
}: {
  value: DiscoveryFilters['type'];
  onChange: (value: DiscoveryFilters['type']) => void;
}) {
  return (
    <div className="mt-6 px-5">
      <div
        aria-label="نوع سالن"
        className="grid grid-cols-3 rounded-2xl bg-sand p-1"
        role="group"
      >
        {(
          [
            ['all', 'همه'],
            ['men', 'آقایان'],
            ['women', 'بانوان'],
          ] as const
        ).map(([type, label]) => (
          <button
            aria-pressed={value === type}
            className={`h-11 rounded-xl text-sm font-bold transition ${value === type ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'}`}
            key={type}
            onClick={() => onChange(type)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
