import Link from 'next/link';
import { Button } from './button';
import { FormError } from '../../lib/forms/form-error';
import { HttpFailure } from '../../lib/api/http-client';
export function FailureNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  const failure = error instanceof HttpFailure ? error : null;
  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger bg-surface p-4 text-sm leading-7 text-danger"
    >
      <p>
        {error instanceof HttpFailure || error instanceof FormError
          ? error.message
          : 'ارتباط کامل نشد. دوباره تلاش کنید؛ ممکن است ذخیره انجام شده باشد.'}
      </p>
      {failure && Object.keys(failure.fields).length > 0 && (
        <ul className="list-inside list-disc">
          {Object.entries(failure.fields).map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      )}
      {failure?.status === 401 ? (
        <Link
          href="/sign-in"
          className="underline"
        >
          ورود دوباره
        </Link>
      ) : null}
      {failure?.code === 'VERSION_CONFLICT' && (
        <p>نسخه تازه را بارگذاری کنید و تغییرات را دوباره بررسی کنید.</p>
      )}
      {retry && (
        <Button
          variant="secondary"
          onClick={retry}
          className="mt-2"
        >
          بارگذاری دوباره
        </Button>
      )}
    </div>
  );
}
export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: unknown;
  retry: () => void;
}) {
  return loading ? (
    <p
      role="status"
      className="p-4 text-sm"
    >
      در حال بارگذاری…
    </p>
  ) : error ? (
    <FailureNotice
      error={error}
      retry={retry}
    />
  ) : null;
}
