import type { PublicHours } from '../model/catalog.types';
const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
export function PublicHoursList({ hours }: { hours: PublicHours[] }) {
  return hours.length ? (
    <dl className="space-y-2">
      {days.map((day, i) => {
        const rows = hours.filter((h) => h.weekday === i);
        return (
          <div
            key={day}
            className="flex flex-wrap justify-between gap-2 border-b border-line py-2"
          >
            <dt>{day}</dt>
            <dd dir="ltr">
              {rows.length
                ? rows.map((h) => `${h.start_local}–${h.end_local}`).join(' / ')
                : 'تعطیل'}
            </dd>
          </div>
        );
      })}
    </dl>
  ) : (
    <p className="text-muted">ساعتی ثبت نشده است.</p>
  );
}
