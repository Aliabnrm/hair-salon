import Link from 'next/link';
import { PageActionBar } from '../../../components/layout/page-action-bar';
import { buttonStyles } from '../../../components/ui/button';
import { Icon } from '../../../components/ui/icon';
import { formatPrice } from '../../public-catalog';
import { persianDate } from '../../../lib/format/local-date';
import type { Availability, AvailabilitySlot } from '../model/availability.types';

export function SelectionSummary({
  times,
  slot,
  date,
  staffName,
}: {
  times: Availability;
  slot: AvailabilitySlot;
  date: string;
  staffName: string;
}) {
  return (
    <PageActionBar label="خلاصه انتخاب">
      <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-7">
            {times.service.name} · <bdi>{slot.start_local}</bdi>
          </p>
          <p className="text-xs leading-6 text-ink-soft">
            {persianDate(date)} · {times.service.duration_minutes.toLocaleString('fa-IR')} دقیقه
          </p>
        </div>
        <p className="font-bold leading-7 text-petrol-deep">
          {formatPrice(times.service.price_irr)}
        </p>
      </div>
      <p className="sr-only">
        متخصص: {staffName}؛ شروع و پایان: {slot.start_local} تا {slot.end_local}
      </p>
      <Link
        className={buttonStyles.primary + ' w-full'}
        href={`/salons/${times.business_id}/book?${new URLSearchParams({ service_id: times.service_id, staff_id: times.staff_id, starts_at: slot.starts_at })}`}
      >
        ادامه رزرو{' '}
        <Icon
          name="forward"
          size={18}
        />
      </Link>
      <p className="text-center text-xs leading-6 text-muted">
        هنوز نوبتی ثبت نشده؛ ثبت نهایی در گام بعد است.
      </p>
    </PageActionBar>
  );
}
