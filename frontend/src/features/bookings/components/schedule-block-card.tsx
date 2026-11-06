import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { TextField } from '../../../components/ui/text-field';
import { persianDate } from '../../../lib/format/local-date';
import { appointmentTime, tehranDate } from '../model/booking-values';
import type { ScheduleBlock } from '../model/salon-operations';
import { useBlockMutation } from '../hooks/use-block-mutation';
import { releaseBlock } from '../api/salon-operations.api';
import { MutationFeedback } from './booking-feedback';
export function ScheduleBlockCard({
  block,
  refresh,
  stale,
}: {
  block: ScheduleBlock;
  refresh: () => Promise<void>;
  stale: boolean;
}) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(''),
    mutation = useBlockMutation(block.business_id, block.id, 'block-release'),
    locked =
      mutation.pending || mutation.uncertain || mutation.recovering || Boolean(mutation.result);
  useEffect(() => {
    if (mutation.result) void refresh();
  }, [mutation.result, refresh]);
  return (
    <article className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h3 className="font-bold">
        {block.staff_name} · {block.released_at ? 'مسدودی رفع‌شده' : 'زمان مسدود'}
      </h3>
      <p className="text-sm leading-8">
        {persianDate(tehranDate(block.starts_at))} · {appointmentTime(block.starts_at)} تا{' '}
        {appointmentTime(block.ends_at)}
      </p>
      <p className="break-words text-sm leading-8">دلیل خصوصی: {block.reason}</p>
      {block.release_reason && (
        <p className="text-sm leading-8">دلیل رفع مسدودی: {block.release_reason}</p>
      )}
      <MutationFeedback
        state={mutation}
        returnTo={`/manage/${block.business_id}/appointments`}
      />
      {!block.released_at &&
        (!open ? (
          <Button
            variant="secondary"
            disabled={stale}
            onClick={() => setOpen(true)}
          >
            رفع مسدودی
          </Button>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void mutation.execute((key, signal) =>
                releaseBlock(block.business_id, block.id, reason, block.version, key, signal),
              );
            }}
          >
            <TextField
              label="دلیل رفع مسدودی"
              required
              minLength={3}
              maxLength={300}
              disabled={locked}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={locked || stale || mutation.waiting}
              >
                تأیید رفع مسدودی
              </Button>
              <Button
                variant="ghost"
                disabled={locked}
                onClick={() => setOpen(false)}
              >
                انصراف
              </Button>
            </div>
          </form>
        ))}
    </article>
  );
}
