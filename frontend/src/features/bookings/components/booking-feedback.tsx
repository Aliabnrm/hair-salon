import Link from 'next/link';
import { HttpFailure } from '../../../lib/api/http-client';
import { Button } from '../../../components/ui/button';
import { bookingMessage } from '../model/booking-values';
export function BookingFeedback({
  error,
  loading,
  retry,
  returnTo = '/appointments',
}: {
  error: unknown;
  loading: boolean;
  retry: () => void;
  returnTo?: string;
}) {
  return (
    <div
      aria-live="polite"
      aria-busy={loading}
    >
      {loading && (
        <div
          role="status"
          className="rounded-2xl bg-sand p-4"
        >
          <div
            aria-hidden="true"
            className="skeleton mb-3 h-12 rounded-xl"
          />
          در حال دریافت تازه‌ترین اطلاعات…
        </div>
      )}
      {error !== null && (
        <div
          role="alert"
          className="space-y-3 rounded-2xl border border-danger/20 bg-danger-soft p-4 text-sm leading-8 text-danger"
        >
          <p>{bookingMessage(error)}</p>
          {error instanceof HttpFailure && error.status === 401 && (
            <Link
              className="inline-flex min-h-11 items-center font-bold text-petrol"
              href={'/sign-in?' + new URLSearchParams({ returnTo })}
            >
              ورود دوباره و ادامه
            </Link>
          )}
          <Button
            variant="secondary"
            onClick={retry}
          >
            تلاش دوباره
          </Button>
        </div>
      )}
    </div>
  );
}
export function MutationFeedback({
  state,
  returnTo = '/appointments',
}: {
  returnTo?: string;
  state: {
    pending: boolean;
    error: unknown;
    uncertain: boolean;
    recovering: boolean;
    check: () => Promise<void>;
  };
}) {
  return (
    <div aria-live="polite">
      {state.recovering && (
        <p
          role="status"
          className="rounded-2xl bg-sand p-4"
        >
          در حال بررسی نتیجه درخواست قبلی…
        </p>
      )}
      {state.error !== null && (
        <p
          role="alert"
          className="rounded-2xl bg-danger-soft p-4 text-sm leading-8 text-danger"
        >
          {bookingMessage(state.error)}
        </p>
      )}
      {state.error instanceof HttpFailure && state.error.status === 401 && (
        <Link
          className="inline-flex min-h-11 items-center font-bold text-petrol"
          href={'/sign-in?' + new URLSearchParams({ returnTo })}
        >
          ورود دوباره و ادامه
        </Link>
      )}
      {state.uncertain && (
        <div className="mt-3 space-y-3 rounded-2xl bg-sand p-4 text-sm leading-8">
          <p>
            نتیجه درخواست هنوز مشخص نیست. ابتدا نتیجه را بررسی کنید؛ تلاش مجدد با همین کلید انجام
            می‌شود تا نوبت تکراری ساخته نشود.
          </p>
          <Button
            variant="secondary"
            disabled={state.pending || state.recovering}
            onClick={() => void state.check()}
          >
            بررسی نتیجه درخواست
          </Button>
        </div>
      )}
    </div>
  );
}
