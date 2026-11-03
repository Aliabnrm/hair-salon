import { monthDays } from '../model/selection';
const weekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
export function DayPicker({
  first,
  last,
  selected,
  choose,
}: {
  first: string;
  last: string;
  selected: string;
  choose: (date: string) => void;
}) {
  return (
    <section
      aria-label="انتخاب روز"
      className="rounded-3xl border border-line bg-surface p-3 shadow-card"
    >
      <h2 className="mb-3 text-lg font-bold">۲. روز مراجعه</h2>
      <p className="mb-4 text-sm leading-7 text-muted">۳۰ روز آینده، به وقت تهران</p>
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[19.25rem] space-y-5">
          {monthDays(first, last).map((month) => (
            <section
              key={month.title}
              aria-label={month.title}
            >
              <h3 className="mb-3 font-bold text-petrol-deep">{month.title}</h3>
              <div
                aria-hidden="true"
                className="mb-1 grid grid-cols-7 text-center text-sm text-muted"
              >
                {weekdays.map((day, i) => (
                  <span key={i}>{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: month.offset }, (_, i) => (
                  <span key={`blank-${i}`} />
                ))}
                {month.dates.map((day) => (
                  <button
                    key={day.iso}
                    type="button"
                    data-date={day.iso}
                    aria-label={`${day.full}${day.iso === first ? '، امروز' : ''}`}
                    aria-pressed={selected === day.iso}
                    onClick={() => choose(day.iso)}
                    className={`flex min-h-13 min-w-11 flex-col items-center justify-center rounded-xl px-1 py-2 font-bold ${selected === day.iso ? 'bg-petrol text-white' : 'text-ink hover:bg-petrol-soft'}`}
                  >
                    <span>{day.label}</span>
                    {day.iso === first && <span className="text-xs">امروز</span>}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
