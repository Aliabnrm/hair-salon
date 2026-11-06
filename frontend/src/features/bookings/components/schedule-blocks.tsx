import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import type { AgendaOverview } from '../model/salon-operations';
import { ScheduleBlockForm, type BlockStaff } from './schedule-block-form';
import { ScheduleBlockCard } from './schedule-block-card';
export function ScheduleBlocks({
  business,
  date,
  staff,
  overview,
  refresh,
  stale,
}: {
  business: string;
  date: string;
  staff: BlockStaff[];
  overview: AgendaOverview;
  refresh: () => Promise<void>;
  stale: boolean;
}) {
  const [form, setForm] = useState(0),
    [open, setOpen] = useState(false);
  return (
    <section
      className="min-w-0 space-y-4 rounded-3xl border border-line bg-surface p-4"
      aria-label="مسدودی‌های برنامه"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">مسدودی‌های برنامه</h2>
        <Button
          variant="secondary"
          disabled={stale}
          onClick={() => {
            if (!open) setForm((n) => n + 1);
            setOpen(!open);
          }}
        >
          {open ? 'بستن فرم مسدودی' : 'مسدودکردن زمان'}
        </Button>
      </div>
      {open && (
        <ScheduleBlockForm
          key={form}
          business={business}
          date={date}
          staff={staff}
          refresh={refresh}
        />
      )}
      {!overview.blocks.length && (
        <p className="text-sm leading-8 text-muted">
          در این بازه برای متخصص انتخاب‌شده مسدودی ثبت نشده است.
        </p>
      )}
      {overview.blocks.map((b) => (
        <ScheduleBlockCard
          key={b.id + ':' + b.version}
          block={b}
          refresh={refresh}
          stale={stale}
        />
      ))}
      {overview.blocks_truncated && (
        <p className="text-sm leading-8">
          ۲۰۰ مسدودی نخست نمایش داده می‌شود؛ برای دیدن جزئیات، بازه را روزانه و متخصص را مشخص انتخاب
          کنید.
        </p>
      )}
    </section>
  );
}
