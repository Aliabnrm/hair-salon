import type { AgendaOverview } from '../model/salon-operations';
export function AgendaSummary({ summary }: { summary: AgendaOverview['summary'] }) {
  const values = [
    ['کل نوبت‌ها', summary.total],
    ['قطعی', summary.confirmed],
    ['انجام‌شده', summary.completed],
    ['لغوشده', summary.cancelled],
    ['عدم حضور', summary.no_show],
    ['منتظر ثبت نتیجه', summary.awaiting_outcome],
  ] as const;
  return (
    <section
      className="space-y-3"
      aria-label="خلاصه برنامه سالن"
    >
      <h2 className="text-lg font-extrabold">خلاصه بازه انتخابی</h2>
      <p className="text-xs leading-7 text-muted">
        برای متخصص انتخاب‌شده، پیش از فیلتر وضعیت و صفحه‌بندی؛ نتیجه ثبت‌نشده به معنی عدم حضور نیست.
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {values.map(([label, count]) => (
          <div
            key={label}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <dt className="text-xs leading-7 text-ink-soft">{label}</dt>
            <dd className="mt-2 text-2xl font-extrabold text-petrol">
              {count.toLocaleString('fa-IR')}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
