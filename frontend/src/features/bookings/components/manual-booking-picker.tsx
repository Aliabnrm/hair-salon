import { Button } from '../../../components/ui/button';
import { DayPicker } from '../../availability';
import type { useManualBooking } from '../hooks/use-manual-booking';
export function ManualBookingPicker({
  state,
  disabled,
}: {
  state: ReturnType<typeof useManualBooking>;
  disabled: boolean;
}) {
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-4"
    >
      <legend className="mb-3 text-lg font-bold">خدمت و زمان مراجعه</legend>
      <label className="block text-sm font-bold">
        خدمت
        <select
          className="mt-2 h-14 w-full min-w-0 rounded-2xl border border-line-strong bg-surface px-3 text-base"
          value={state.service}
          onChange={(e) => state.change({ service: e.target.value })}
        >
          <option
            value=""
            disabled
          >
            انتخاب خدمت
          </option>
          {state.catalog.data?.services.map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-bold">
        متخصص
        <select
          className="mt-2 h-14 w-full min-w-0 rounded-2xl border border-line-strong bg-surface px-3 text-base"
          value={state.staff}
          onChange={(e) => state.change({ staff: e.target.value })}
        >
          <option value="any">اولین متخصص آزاد</option>
          {state.catalog.data?.staff
            .filter((s) => s.service_ids.includes(state.service))
            .map((s) => (
              <option
                key={s.id}
                value={s.id}
              >
                {s.display_name}
              </option>
            ))}
        </select>
      </label>
      {state.times.data && (
        <DayPicker
          first={state.times.data.policy.first_allowed_date}
          last={state.times.data.policy.last_allowed_date}
          selected={state.date}
          choose={(date) => state.change({ date })}
        />
      )}
      {!state.times.loading && !state.times.error && state.times.data && (
        <section aria-label="ساعت‌های آزاد ثبت دستی">
          <h2 className="mb-3 font-bold">ساعت مراجعه</h2>
          {state.slots.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {state.slots.map((s) => (
                <Button
                  key={s.starts_at}
                  variant={state.chosen?.starts_at === s.starts_at ? 'primary' : 'secondary'}
                  aria-pressed={state.chosen?.starts_at === s.starts_at}
                  onClick={() => state.change({ start: s.starts_at })}
                >
                  <bdi>{s.start_local}</bdi>
                </Button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-sand p-4 text-sm leading-8">
              در این روز زمان آزادی برای این انتخاب ندارید.
            </p>
          )}
        </section>
      )}
    </fieldset>
  );
}
