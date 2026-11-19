import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { TextField } from '../../../components/ui/text-field';
import { SelectControl } from '../../../components/ui/select-control';
import { useSession } from '../../identity';
import { useBookingMutation } from '../hooks/use-booking-mutation';
import { saveOutcome } from '../api/salon-operations.api';
import type { Appointment } from '../model/booking.types';
import { MutationFeedback } from './booking-feedback';
export function OutcomeForm({
  item,
  checkedAt,
  refresh,
}: {
  item: Appointment;
  checkedAt: string;
  refresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [status, setStatus] = useState<'confirmed' | 'completed' | 'no_show'>(
      item.status === 'confirmed' ? 'completed' : 'confirmed',
    ),
    [reason, setReason] = useState('');
  const session = useSession(),
    mutation = useBookingMutation(`${session.user?.id}:${item.id}`, 'outcome');
  useEffect(() => {
    if (mutation.result) void refresh();
  }, [mutation.result, refresh]);
  const correcting = item.status !== 'confirmed',
    locked =
      mutation.pending || mutation.uncertain || mutation.recovering || Boolean(mutation.result),
    now = Date.parse(checkedAt),
    canComplete = now >= Date.parse(item.ends_at),
    canNoShow = now >= Date.parse(item.starts_at) + 15 * 60000;
  return (
    <section className="space-y-4 rounded-3xl border border-petrol/20 bg-surface p-5">
      <h2 className="text-lg font-extrabold">
        {correcting ? 'اصلاح نتیجه مراجعه' : 'نتیجه مراجعه'}
      </h2>
      <p className="text-sm leading-8 text-ink-soft">
        انجام خدمت پس از پایان نوبت و عدم حضور از ۱۵ دقیقه پس از شروع قابل ثبت است. نتیجه خودکار ثبت
        نمی‌شود؛ مبلغ پرداخت‌شده نیز ثبت نمی‌شود.
      </p>
      <MutationFeedback
        state={mutation}
        returnTo={`/manage/${item.business_id}/appointments/${item.id}`}
      />
      {!open ? (
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
        >
          {correcting ? 'اصلاح با دلیل' : 'ثبت نتیجه مراجعه'}
        </Button>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void mutation.execute((key, signal) =>
              saveOutcome(
                item.business_id,
                item.id,
                status,
                reason.trim() || null,
                item.version,
                key,
                signal,
              ),
            );
          }}
        >
          <label className="block text-sm font-bold">
            نتیجه نوبت
            <SelectControl
              className="mt-2 min-h-12 w-full rounded-xl border border-line p-3 text-base"
              value={status}
              disabled={locked}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'completed' || v === 'no_show' || v === 'confirmed') setStatus(v);
              }}
            >
              <option
                value="completed"
                disabled={!canComplete || item.status === 'completed'}
              >
                انجام‌شده
              </option>
              <option
                value="no_show"
                disabled={!canNoShow || item.status === 'no_show'}
              >
                عدم حضور
              </option>
              {correcting && (
                <option value="confirmed">بازگشت به قطعی؛ نتیجه هنوز مشخص نیست</option>
              )}
            </SelectControl>
          </label>
          <TextField
            label={correcting ? 'دلیل اصلاح نتیجه' : 'توضیح نتیجه (اختیاری)'}
            required={correcting}
            minLength={3}
            maxLength={300}
            value={reason}
            disabled={locked}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-sm leading-8">
            با تأیید، این نتیجه در سابقه نوبت شما و مشتری ثبت می‌شود. ظرفیت نوبت با ثبت نتیجه آزاد
            نمی‌شود.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={
                locked ||
                mutation.waiting ||
                status === item.status ||
                (status === 'completed' && !canComplete) ||
                (status === 'no_show' && !canNoShow)
              }
            >
              {mutation.pending ? 'در حال ثبت…' : 'تأیید نتیجه مراجعه'}
            </Button>
            <Button
              variant="ghost"
              disabled={locked}
              onClick={() => setOpen(false)}
            >
              انصراف
            </Button>
            <Button
              variant="ghost"
              disabled={locked}
              onClick={() => void refresh()}
            >
              دریافت وضعیت تازه
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
