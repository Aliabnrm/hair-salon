import { Icon } from '../../../components/ui/icon';
export function DiscoverySearch({
  query,
  onChange,
}: {
  query: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-5 flex h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 shadow-card transition focus-within:border-petrol focus-within:ring-3 focus-within:ring-petrol/25">
      <Icon className="text-muted" name="search" />
      <span className="sr-only">جستجوی خدمت، سالن یا محله</span>
      <input
        className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted focus-visible:outline-none"
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value)}
        placeholder="جستجوی خدمت، سالن یا محله"
        type="search"
        value={query}
      />
      {query && (
        <button
          aria-label="پاک کردن جستجو"
          className="-me-2 grid size-10 place-items-center rounded-full text-muted hover:bg-sand"
          onClick={() => onChange('')}
          type="button"
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </label>
  );
}
