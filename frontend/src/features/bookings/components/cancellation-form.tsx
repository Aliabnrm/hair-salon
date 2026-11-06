import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { TextField } from '../../../components/ui/text-field';
import { useSession } from '../../identity';
import { useBookingMutation } from '../hooks/use-booking-mutation';
import { cancelCustomerAppointment } from '../api/booking-changes.api';
import { cancelAppointment } from '../api/bookings.api';
import type { Appointment } from '../model/booking.types';
import { MutationFeedback } from './booking-feedback';
export function CancellationForm({
  item,
  refresh,
  customer = false,
}: {
  item: Appointment;
  customer?: boolean;
  refresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(''),
    session = useSession();
  const mutation = useBookingMutation(
    `${session.user?.id}:${item.id}`,
    customer ? 'customer-cancel' : 'cancel',
  );
  useEffect(() => {
    if (mutation.result) void refresh();
  }, [mutation.result, refresh]);
  return (
    <section className="space-y-4 rounded-3xl border border-danger/20 bg-surface p-5">
      <h2 className="font-bold">لغو نوبت</h2>
      <p className="text-sm leading-8 text-ink-soft">
        {customer
          ? 'با لغو، این زمان آزاد می‌شود و سالن نتیجه را در دفتر نوبت‌ها می‌بیند. پیامکی ارسال نمی‌شود.'
          : 'فقط پیش از شروع نوبت امکان لغو دارید. پیامکی ارسال نمی‌شود؛ هماهنگی با مراجعه‌کننده را تلفنی انجام دهید.'}
      </p>
      <MutationFeedback
        state={mutation}
        returnTo={
          customer ? `/appointments/${item.id}` : `/manage/${item.business_id}/appointments`
        }
      />
      {!open ? (
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
        >
          لغو با دلیل
        </Button>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void mutation.execute((key, signal) =>
              customer
                ? cancelCustomerAppointment(item.id, reason, item.version, key, signal)
                : cancelAppointment(item.business_id, item.id, reason, item.version, key, signal),
            );
          }}
        >
          <TextField
            label="دلیل لغو"
            required
            minLength={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={mutation.pending || mutation.uncertain || mutation.recovering}
          />
          <p className="text-sm leading-8">
            با تأیید، نوبت لغو و ظرفیت آزاد می‌شود. سابقه آن حفظ خواهد شد.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={
                mutation.pending || mutation.recovering || mutation.waiting || mutation.uncertain
              }
            >
              {mutation.pending ? 'در حال لغو…' : 'تأیید لغو نوبت'}
            </Button>
            <Button
              variant="ghost"
              disabled={mutation.pending || mutation.uncertain}
              onClick={() => setOpen(false)}
            >
              انصراف
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
