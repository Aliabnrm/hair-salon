import { Button } from '../../../components/ui/button';
import { HttpFailure } from '../../../lib/api/http-client';
import { FailureNotice } from '../../../components/ui/request-status';
import type { ManagedMutation } from '../hooks/use-managed-mutation';
export { FailureNotice, LoadState } from '../../../components/ui/request-status';
export function RequestFeedback({
  mutation,
  showSuccess = true,
  allowRetry = true,
}: {
  mutation: ManagedMutation;
  showSuccess?: boolean;
  allowRetry?: boolean;
}) {
  return (
    <div
      aria-live="polite"
      className="space-y-2"
    >
      {mutation.pending && <p role="status">در حال ذخیره…</p>}
      {mutation.success && showSuccess && (
        <p
          role="status"
          className="text-petrol"
        >
          با موفقیت ذخیره شد.
        </p>
      )}
      {mutation.error !== null && (
        <>
          <FailureNotice error={mutation.error} />
          {mutation.uncertain && (
            <p className="text-sm leading-7">
              نتیجه ذخیره مشخص نیست. ابتدا با همان درخواست دوباره تلاش کنید؛ فرم را تغییر ندهید.
            </p>
          )}
          {allowRetry &&
            !(
              mutation.error instanceof HttpFailure &&
              [401, 403, 404, 422, 428].includes(mutation.error.status)
            ) && (
              <Button
                variant="secondary"
                disabled={mutation.pending || mutation.waiting}
                onClick={() => void mutation.retry()}
              >
                {mutation.waiting ? 'کمی صبر کنید' : 'تلاش دوباره با همان درخواست'}
              </Button>
            )}
        </>
      )}
    </div>
  );
}
