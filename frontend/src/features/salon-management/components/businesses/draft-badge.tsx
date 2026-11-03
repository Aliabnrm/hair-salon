import type { Business } from '../../model/management.types';
export const publicationLabels: Record<Business['state'], string> = {
  draft: 'پیش‌نویس',
  pending_review: 'در انتظار بررسی',
  published: 'منتشرشده',
  suspended: 'تعلیق‌شده',
};
export function DraftBadge({ state = 'draft' }: { state?: Business['state'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold leading-6 ${state === 'published' ? 'bg-petrol-soft text-petrol-deep' : state === 'suspended' ? 'bg-clay-soft text-clay' : 'bg-saffron-soft text-saffron-deep'}`}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current"
      />
      {publicationLabels[state]}
    </span>
  );
}
