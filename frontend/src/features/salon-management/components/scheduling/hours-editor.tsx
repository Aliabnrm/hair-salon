import { useState, type FormEvent } from 'react';
import { Button } from '../../../../components/ui/button';
import * as api from '../../api/management.api';
import type { Hours, Interval, WeeklyInterval } from '../../model/management.types';
import { useManagedMutation } from '../../hooks/use-managed-mutation';
import { RequestFeedback } from '../request-feedback';
import { IntervalEditor } from './interval-editor';
const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
export function HoursEditor({
  businessId,
  staffId,
  hours,
  onSaved,
}: {
  businessId: string;
  staffId: string | null;
  hours: Hours;
  onSaved: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<WeeklyInterval[]>(hours.intervals),
    mutation = useManagedMutation();
  const update = (weekday: number, intervals: Interval[]) =>
    setRows((old) => [
      ...old.filter((r) => r.weekday !== weekday),
      ...intervals.map((r) => ({ ...r, weekday })),
    ]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.execute(
      JSON.stringify([staffId, hours.version, rows]),
      (key, signal) => api.putHours(businessId, staffId, rows, hours.version, key, signal),
      onSaved,
    );
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => void submit(e)}
    >
      <p className="text-sm leading-7 text-muted">
        فاصله بین بازه‌ها زمان استراحت است. ساعات هر روز مستقل‌اند؛ پایان 24:00 مجاز است. ذخیره بدون
        بازه یعنی تعطیلی کل هفته.
      </p>
      <fieldset
        disabled={mutation.pending || mutation.uncertain}
        className="space-y-4"
      >
        {days.map((day, weekday) => (
          <IntervalEditor
            key={day}
            label={day}
            intervals={rows.filter((r) => r.weekday === weekday)}
            onChange={(values) => update(weekday, values)}
          />
        ))}
        <Button
          type="submit"
          className="w-full"
        >
          ذخیره برنامه هفتگی
        </Button>
      </fieldset>
      <RequestFeedback mutation={mutation} />
    </form>
  );
}
