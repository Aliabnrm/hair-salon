import { SelectControl } from '../../../components/ui/select-control';
import { Button } from '../../../components/ui/button';
import { DayPicker } from '../../availability';
import { statusLabels } from '../model/appointment-status';
import { inDays, persianDate } from '../../../lib/format/local-date';
import { tehranDate, appointmentTime } from '../model/booking-values';
import type { useAgenda } from '../hooks/use-agenda';
export function AgendaFilters({ agenda }: { agenda: ReturnType<typeof useAgenda> }) {
  const { date, week, staff, status, catalog, remote, changeDate } = agenda;
  return (
    <section
      className="space-y-4 rounded-3xl border border-line bg-surface p-4"
      aria-label="فیلتر دفتر نوبت‌ها"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={() => changeDate(inDays(date, week ? -7 : -1))}
        >
          {week ? 'هفته قبل' : 'روز قبل'}
        </Button>
        <h2 className="font-bold">
          {persianDate(date)}
          {week ? ' تا ' + persianDate(inDays(date, 6)) : ''}
        </h2>
        <Button
          variant="ghost"
          onClick={() => changeDate(inDays(date, week ? 7 : 1))}
        >
          {week ? 'هفته بعد' : 'روز بعد'}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={week ? 'secondary' : 'primary'}
          aria-pressed={!week}
          onClick={() => agenda.changeWeek(false)}
        >
          نمای روز
        </Button>
        <Button
          variant={week ? 'primary' : 'secondary'}
          aria-pressed={week}
          onClick={() => agenda.changeWeek(true)}
        >
          فهرست هفته
        </Button>
        <Button
          variant="secondary"
          onClick={() => changeDate(tehranDate())}
        >
          امروز
        </Button>
        <Button
          variant="secondary"
          onClick={() => void remote.reload()}
        >
          تازه‌سازی نوبت‌ها
        </Button>
      </div>
      <label className="block text-sm font-bold">
        متخصص
        <SelectControl
          containerClassName="mt-2"
          className="h-14 rounded-2xl border border-line-strong bg-surface text-base"
          value={staff}
          onChange={(e) => {
            agenda.changeStaff(e.target.value);
          }}
        >
          <option value="any">همه متخصصان</option>
          {catalog.data?.staff.map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.display_name}
              {s.active ? '' : ' (غیرفعال)'}
            </option>
          ))}
        </SelectControl>
      </label>
      <label className="block text-sm font-bold">
        وضعیت نوبت
        <SelectControl
          containerClassName="mt-2"
          className="min-h-12 rounded-2xl border border-line bg-surface text-base"
          value={status}
          onChange={(e) => agenda.changeStatus(e.target.value)}
        >
          <option value="any">همه وضعیت‌ها</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option
              key={value}
              value={value}
            >
              {label}
            </option>
          ))}
        </SelectControl>
      </label>
      <DayPicker
        first={inDays(date, -3)}
        last={inDays(date, 10)}
        selected={date}
        today={tehranDate()}
        choose={changeDate}
      />
      {remote.updatedAt && (
        <p className="text-xs leading-7 text-muted">
          آخرین دریافت موفق: {appointmentTime(remote.updatedAt)} · با بازگشت به صفحه تازه می‌شود.
        </p>
      )}
    </section>
  );
}
