import { Button } from '../../../components/ui/button';
export function Pagination({
  hasNext,
  hasPrevious,
  pending,
  next,
  previous,
}: {
  hasNext: boolean;
  hasPrevious: boolean;
  pending: boolean;
  next: () => void;
  previous: () => void;
}) {
  return hasNext || hasPrevious ? (
    <nav
      aria-label="صفحه‌بندی"
      className="flex justify-between gap-2"
    >
      <Button
        variant="secondary"
        disabled={pending || !hasPrevious}
        onClick={previous}
      >
        صفحه قبل
      </Button>
      <Button
        variant="secondary"
        disabled={pending || !hasNext}
        onClick={next}
      >
        صفحه بعد
      </Button>
    </nav>
  ) : null;
}
