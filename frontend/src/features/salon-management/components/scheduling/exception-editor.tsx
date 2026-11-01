import { useState, type FormEvent } from 'react';
import { Button } from '../../../../components/ui/button';
import { TextField } from '../../../../components/ui/text-field';
import * as api from '../../api/management.api';
import type { ScheduleException, Interval } from '../../model/management.types';
import { jalaliToIso, persianDate, todayIso } from '../../model/form-values';
import { useRemote } from '../../../../lib/hooks/use-remote';
import { useManagedMutation } from '../../hooks/use-managed-mutation';
import { LoadState, RequestFeedback } from '../request-feedback';
import { IntervalEditor } from './interval-editor';
export function ExceptionEditor({
  businessId,
  exception,
  onSaved,
  onCancel,
}: {
  businessId: string;
  exception?: ScheduleException;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const staff = useRemote(businessId, (signal) => api.allStaff(businessId, signal));
  const [date, setDate] = useState(
      exception ? persianDate(exception.local_date) : persianDate(todayIso()),
    ),
    [staffId, setStaffId] = useState(exception?.staff_id ?? ''),
    [closed, setClosed] = useState(exception?.closed ?? true),
    [intervals, setIntervals] = useState<Interval[]>(
      exception?.intervals ?? [{ start_local: '09:00', end_local: '18:00' }],
    ),
    mutation = useManagedMutation();
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const body = {
        local_date: exception?.local_date ?? jalaliToIso(date),
        staff_id: staffId || null,
        closed,
        intervals: closed ? [] : intervals,
      };
      await mutation.execute(
        JSON.stringify([exception?.id, exception?.version, body]),
        (key, signal) =>
          exception
            ? api.updateException(
                businessId,
                exception.id,
                { closed: body.closed, intervals: body.intervals },
                exception.version,
                key,
                signal,
              )
            : api.createException(businessId, body, key, signal),
        onSaved,
      );
    } catch (error) {
      mutation.fail(error);
    }
  }
  const setOpen = (nextClosed: boolean) => {
    setClosed(nextClosed);
    if (!nextClosed && !intervals.length)
      setIntervals([{ start_local: '09:00', end_local: '18:00' }]);
  };
  return (
    <form
      className="space-y-4 rounded-3xl border border-line bg-surface p-4"
      onSubmit={(e) => void submit(e)}
    >
      <h2 className="text-lg font-bold">
        {exception ? 'ویرایش برنامه روز خاص' : 'تعطیلی یا ساعت روز خاص'}
      </h2>
      <fieldset
        className="space-y-4"
        disabled={mutation.pending || mutation.uncertain}
      >
        <TextField
          label="تاریخ شمسی"
          hint="مثال: ۱۴۰۵/۰۸/۱۰؛ تاریخ برنامه ثبت‌شده قابل تغییر نیست."
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={Boolean(exception)}
          required
          dir="ltr"
          inputMode="numeric"
          maxLength={10}
          error={mutation.fields.local_date}
        />
        <label className="block text-sm font-bold">
          محدوده برنامه
          <select
            className="mt-2 h-14 w-full rounded-2xl border border-line-strong bg-surface px-4"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            disabled={Boolean(exception)}
          >
            <option value="">کل سالن</option>
            {staff.data?.map((s) => (
              <option
                key={s.id}
                value={s.id}
              >
                {s.display_name}
              </option>
            ))}
          </select>
        </label>
        <LoadState
          loading={staff.loading}
          error={staff.error}
          retry={() => void staff.reload()}
        />
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={closed}
            onChange={(e) => setOpen(e.target.checked)}
            className="size-5 accent-petrol"
          />
          این روز تعطیل است
        </label>
        {!closed && (
          <IntervalEditor
            label="ساعت جایگزین"
            intervals={intervals}
            onChange={setIntervals}
          />
        )}
        <p className="text-xs leading-6 text-muted">
          این تنظیم جایگزین کل روز است. تعطیلی سالن بر ساعت متخصص مقدم می‌ماند.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={staff.loading || Boolean(staff.error)}
          >
            ذخیره روز خاص
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            انصراف
          </Button>
        </div>
      </fieldset>
      <RequestFeedback mutation={mutation} />
    </form>
  );
}
