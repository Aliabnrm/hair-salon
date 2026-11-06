import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { TextField } from '../../../components/ui/text-field';
import { SelectControl } from '../../../components/ui/select-control';
import { DayPicker } from '../../availability';
import { inDays, persianDate } from '../../../lib/format/local-date';
import { tehranInstant } from '../../../lib/format/tehran-instant';
import { tehranDate } from '../model/booking-values';
import { useBlockMutation } from '../hooks/use-block-mutation';
import { createBlock } from '../api/salon-operations.api';
import { MutationFeedback } from './booking-feedback';
export interface BlockStaff {
  id: string;
  display_name: string;
  active: boolean;
}
export function ScheduleBlockForm({
  business,
  date,
  staff,
  refresh,
}: {
  business: string;
  date: string;
  staff: BlockStaff[];
  refresh: () => Promise<void>;
}) {
  const today = tehranDate(),
    [day, setDay] = useState(date < today ? today : date),
    [selected, setSelected] = useState(''),
    [start, setStart] = useState('12:00'),
    [end, setEnd] = useState('13:00'),
    [reason, setReason] = useState(''),
    [formError, setFormError] = useState('');
  const mutation = useBlockMutation(business, 'new', 'block-create'),
    locked =
      mutation.pending || mutation.uncertain || mutation.recovering || Boolean(mutation.result);
  useEffect(() => {
    if (mutation.result) void refresh();
  }, [mutation.result, refresh]);
  return (
    <form
      className="space-y-4 rounded-2xl bg-sand p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setFormError('');
        try {
          const input = {
            staff_id: selected,
            starts_at: tehranInstant(day, start),
            ends_at: tehranInstant(end <= start ? inDays(day, 1) : day, end),
            reason,
          };
          void mutation.execute((key, signal) => createBlock(business, input, key, signal));
        } catch (error) {
          setFormError(error instanceof Error ? error.message : 'روز و ساعت معتبر انتخاب کنید.');
        }
      }}
    >
      <h3 className="font-extrabold">مسدودکردن زمان متخصص</h3>
      <p className="text-sm leading-8">
        برای استراحت یا کار شخصی؛ بازه دارای نوبت قابل مسدودکردن نیست. دلیل فقط برای مدیریت سالن
        نمایش داده می‌شود. بازه حداکثر ۲۴ ساعت است.
      </p>
      <MutationFeedback
        state={mutation}
        returnTo={`/manage/${business}/appointments`}
      />
      {mutation.result ? (
        <p
          role="status"
          className="font-bold text-petrol"
        >
          مسدودی ثبت شد؛ وضعیت فعلی در فهرست زیر نمایش داده می‌شود.
        </p>
      ) : (
        <fieldset
          disabled={locked}
          className="min-w-0 space-y-4"
        >
          <label className="block text-sm font-bold">
            متخصص مسدودی
            <SelectControl
              className="mt-2 min-h-12 w-full rounded-xl border border-line bg-surface p-3 text-base"
              required
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">انتخاب متخصص</option>
              {staff
                .filter((s) => s.active)
                .map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                  >
                    {s.display_name}
                  </option>
                ))}
            </SelectControl>
          </label>
          <DayPicker
            first={today}
            last={inDays(today, 29)}
            selected={day}
            choose={setDay}
          />
          <p className="text-sm">{persianDate(day)} · ساعت تهران</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="شروع مسدودی"
              type="time"
              step={900}
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <TextField
              label="پایان مسدودی"
              type="time"
              step={900}
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <p className="text-sm leading-8">
            پایان بازه: {persianDate(end <= start ? inDays(day, 1) : day)}، {end}؛ اگر ساعت پایان
            جلوتر از شروع نباشد، روز بعد در نظر گرفته می‌شود.
          </p>
          <TextField
            label="دلیل خصوصی مسدودی"
            required
            minLength={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-sm leading-8">
            با تأیید، این زمان برای مشتری قابل رزرو نخواهد بود. هیچ نوبت قبلی لغو نمی‌شود.
          </p>
          {formError && (
            <p
              role="alert"
              className="text-danger"
            >
              {formError}
            </p>
          )}
          <Button
            type="submit"
            disabled={locked || mutation.waiting}
          >
            {mutation.pending ? 'در حال ثبت…' : 'تأیید مسدودی زمان'}
          </Button>
        </fieldset>
      )}
    </form>
  );
}
