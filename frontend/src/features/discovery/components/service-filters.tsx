import type { Category } from '../../public-catalog';
export const chipClass = (active: boolean) =>
  `inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${active ? 'border-petrol bg-petrol text-white' : 'border-line bg-surface text-ink-soft hover:border-line-strong'}`;
export function ServiceFilters({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div
      aria-label="فیلتر خدمت"
      className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 py-1"
      role="group"
    >
      <button
        aria-pressed={!value}
        className={chipClass(!value)}
        onClick={() => onChange(null)}
        type="button"
      >
        همه خدمات
      </button>
      {categories.map((c) => (
        <button
          aria-pressed={value === c.id}
          className={chipClass(value === c.id)}
          key={c.id}
          onClick={() => onChange(c.id)}
          type="button"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
