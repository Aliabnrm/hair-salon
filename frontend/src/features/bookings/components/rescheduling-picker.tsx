import { SelectControl } from '../../../components/ui/select-control';
import { DayPicker, TimeSlots } from '../../availability';
import { BookingFeedback } from './booking-feedback';
import type { useRescheduling } from '../hooks/use-rescheduling';
export function ReschedulingPicker({ state }: { state: ReturnType<typeof useRescheduling> }) {
  return (
    <fieldset
      disabled={state.locked || !state.current.data?.customer_can_change}
      className="min-w-0 space-y-5"
    >
      <legend className="mb-4 text-lg font-extrabold">انتخاب زمان جایگزین</legend>
      <label className="block text-sm font-bold">
        متخصص نوبت تازه
        <SelectControl
          containerClassName="mt-2"
          className="h-14 rounded-2xl border border-line-strong bg-surface text-base"
          value={state.staff}
          onChange={(e) => state.change({ staff: e.target.value })}
        >
          <option value="any">اولین متخصص آزاد</option>
          {state.times.data?.staff.map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.name}
              {s.id === state.current.data?.appointment.staff_id ? ' (متخصص فعلی)' : ''}
            </option>
          ))}
        </SelectControl>
      </label>
      {state.times.data && (
        <DayPicker
          first={state.times.data.policy.first_allowed_date}
          last={state.times.data.policy.last_allowed_date}
          selected={state.date}
          choose={(date) => state.change({ date })}
        />
      )}
      <BookingFeedback
        error={state.times.error}
        loading={state.times.loading}
        retry={() => void state.times.reload()}
        returnTo={`/appointments/${state.current.data?.appointment_id}/reschedule`}
      />
      {state.times.data && !state.times.loading && !state.times.error && (
        <TimeSlots
          slots={state.slots}
          selected={state.chosen?.starts_at}
          select={(start) => state.change({ start })}
        />
      )}
      {Boolean(state.times.error) && (
        <p className="text-sm leading-8 text-ink-soft">
          نوبت فعلی شما محفوظ است. اگر سالن یا خدمت دیگر رزرو آنلاین ندارد، برای هماهنگی با سالن
          تماس بگیرید.
        </p>
      )}
    </fieldset>
  );
}
