import type { AvailabilitySlot } from '../model/availability.types';
import { digits } from '../../../lib/format/digits';
const localDigits = (value: string) =>
  digits(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);
export function TimeSlots({
  slots,
  selected,
  select,
}: {
  slots: AvailabilitySlot[];
  selected: string | undefined;
  select: (start: string) => void;
}) {
  return (
    <section
      className="rounded-3xl border border-line bg-surface p-4 shadow-card"
      aria-label="زمان‌های قابل ارائه"
    >
      <h2 className="mb-2 text-lg font-bold">۳. ساعت شروع خدمت</h2>
      <p className="mb-4 text-sm leading-7 text-muted">ساعت‌ها به وقت تهران هستند.</p>
      {slots.length === 0 ? (
        <p
          role="status"
          className="rounded-2xl bg-sand p-4 leading-8"
        >
          در این روز زمانی طبق برنامه ثبت‌شده پیدا نشد. روز یا متخصص دیگری را بررسی کنید.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => (
            <button
              key={s.starts_at}
              type="button"
              data-slot={s.starts_at}
              aria-label={`شروع ${s.start_local}، پایان ${s.end_local}`}
              aria-pressed={selected === s.starts_at}
              onClick={() => select(s.starts_at)}
              className={`min-h-13 rounded-2xl border px-2 py-3 font-bold ${selected === s.starts_at ? 'border-petrol bg-petrol text-white' : 'border-line-strong text-petrol-deep hover:bg-petrol-soft'}`}
            >
              <span dir="ltr">{localDigits(s.start_local)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
