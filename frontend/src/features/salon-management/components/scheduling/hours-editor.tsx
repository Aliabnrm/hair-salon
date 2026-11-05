import { useEffect, useState } from 'react';
import { useFieldArray, useForm, type FieldErrors } from 'react-hook-form';
import { ActionToast } from '../../../../components/ui/action-toast';
import { Button } from '../../../../components/ui/button';
import { HttpFailure } from '../../../../lib/api/http-client';
import * as api from '../../api/management.api';
import { useManagedMutation } from '../../hooks/use-managed-mutation';
import type { Hours } from '../../model/management.types';
import { normalizeHours } from '../../model/hours-validation';
import { hoursFailureMessage } from '../../model/hours-feedback';
import { HoursDayEditor, type HoursForm } from './hours-day-editor';

const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function firstError(errors: FieldErrors<HoursForm>): string {
  for (const row of Array.isArray(errors.intervals) ? errors.intervals : []) {
    if (row?.start_local?.message) return row.start_local.message;
    if (row?.end_local?.message) return row.end_local.message;
  }
  return 'زمان‌های واردشده را بررسی کنید.';
}

export function HoursEditor({
  businessId,
  staffId,
  hours,
  onSaved,
  onReload,
  onSaving,
}: {
  businessId: string;
  staffId: string | null;
  hours: Hours;
  onSaved: () => void;
  onReload: () => void;
  onSaving: () => void;
}) {
  const mutation = useManagedMutation();
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(true);
  const form = useForm<HoursForm>({
    defaultValues: { intervals: hours.intervals },
    mode: 'onChange',
  });
  const { control, handleSubmit } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'intervals' });

  useEffect(() => {
    if (mutation.error) setToastVisible(true);
  }, [mutation.error]);

  const submit = handleSubmit(
    async ({ intervals }) => {
      setValidationMessage(null);
      setToastVisible(true);
      const rows = normalizeHours(intervals);
      await mutation.execute(
        JSON.stringify([staffId, hours.version, rows]),
        (key, signal) => api.putHours(businessId, staffId, rows, hours.version, key, signal),
        onSaved,
      );
    },
    (invalid) => {
      setValidationMessage(firstError(invalid));
      setToastVisible(true);
    },
  );
  const failure = mutation.error ? hoursFailureMessage(mutation.error, mutation.uncertain) : null;
  const canRetry =
    mutation.error !== null &&
    (!(mutation.error instanceof HttpFailure) ||
      ![401, 403, 404, 422, 428].includes(mutation.error.status));
  const failureAction =
    mutation.error instanceof HttpFailure && mutation.error.code === 'VERSION_CONFLICT'
      ? { label: 'بارگذاری نسخه تازه', onClick: onReload }
      : canRetry
        ? {
            label: mutation.waiting ? 'کمی صبر کنید' : 'تلاش دوباره با همان درخواست',
            onClick: () => void mutation.retry(),
            disabled: mutation.pending || mutation.waiting,
          }
        : undefined;

  return (
    <form
      className="space-y-4"
      noValidate
      aria-busy={mutation.pending}
      onChange={() => setToastVisible(false)}
      onSubmit={(event) => {
        onSaving();
        void submit(event);
      }}
    >
      <p className="text-sm leading-7 text-muted">
        فاصله بین بازه‌ها زمان استراحت است. ساعات هر روز مستقل‌اند؛ پایان 24:00 مجاز است. ذخیره بدون
        بازه یعنی تعطیلی کل هفته.
      </p>
      <fieldset
        disabled={mutation.pending || mutation.uncertain || mutation.waiting}
        className="space-y-4"
      >
        {days.map((day, weekday) => (
          <HoursDayEditor
            key={day}
            day={day}
            rows={fields.flatMap((field, index) =>
              field.weekday === weekday ? [{ id: field.id, index }] : [],
            )}
            form={form}
            onAdd={() => append({ weekday, start_local: '09:00', end_local: '18:00' })}
            onRemove={(index) => {
              remove(index);
              void form.trigger('intervals');
            }}
          />
        ))}
        <Button
          type="submit"
          className="w-full"
        >
          {mutation.pending
            ? 'در حال ذخیره…'
            : mutation.waiting
              ? 'کمی صبر کنید…'
              : 'ذخیره برنامه هفتگی'}
        </Button>
      </fieldset>
      {failure && !toastVisible && failureAction && (
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
          <p className="mb-2 text-ink-soft">{failure.description}</p>
          <Button
            variant="secondary"
            onClick={failureAction.onClick}
            disabled={failureAction.disabled}
          >
            {failureAction.label}
          </Button>
        </div>
      )}
      {validationMessage && toastVisible && (
        <ActionToast
          tone="error"
          title="زمان‌ها نیاز به اصلاح دارند"
          description={validationMessage}
          onClose={() => setToastVisible(false)}
        />
      )}
      {!validationMessage && failure && toastVisible && (
        <ActionToast
          tone="error"
          title={failure.title}
          description={failure.description}
          onClose={() => setToastVisible(false)}
          action={failureAction}
        />
      )}
    </form>
  );
}
