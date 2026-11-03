'use client';
import Link from 'next/link';
import type { PublicProfileData } from '../../public-catalog';
import { Button } from '../../../components/ui/button';
import { HttpFailure } from '../../../lib/api/http-client';
import { useAvailability } from '../hooks/use-availability';
import { ServiceStaffPicker } from './service-staff-picker';
import { DayPicker } from './day-picker';
import { TimeSlots } from './time-slots';
import { SelectionSummary } from './selection-summary';

export function AvailabilityScreen({ profile: initialProfile }: { profile: PublicProfileData }) {
  const state = useAvailability(initialProfile);
  const unavailable = state.error instanceof HttpFailure && state.error.status === 404;
  return (
    <article className="space-y-5 p-3 sm:p-5">
      <header className="rounded-3xl border border-petrol/15 bg-petrol-soft p-5">
        <Link
          className="inline-flex min-h-11 items-center font-bold text-petrol-deep"
          href={`/salons/${initialProfile.id}`}
        >
          بازگشت به صفحه سالن
        </Link>
        <h1 className="mt-3 break-words text-2xl font-extrabold leading-relaxed">
          بررسی زمان‌های {state.profile.name}
        </h1>
        <p className="mt-3 text-sm leading-8 text-ink-soft">
          زمان‌ها بر اساس برنامه ثبت‌شده سالن هستند؛ ثبت آنلاین نوبت هنوز فعال نیست.
        </p>
      </header>
      {unavailable ? (
        <section
          role="alert"
          className="rounded-3xl bg-surface p-5 leading-8"
        >
          <p>سالن یا انتخاب شما دیگر در دسترس عمومی نیست.</p>
          <Link
            className="inline-flex min-h-11 items-center font-bold text-petrol"
            href="/"
          >
            بازگشت به کاوش سالن‌ها
          </Link>
          <Button
            variant="secondary"
            onClick={state.reset}
          >
            شروع انتخاب دوباره
          </Button>
        </section>
      ) : (
        <>
          <ServiceStaffPicker
            profile={state.profile}
            selection={state.selection}
            change={state.change}
          />
          {state.policy && (
            <DayPicker
              first={state.policy.first_allowed_date}
              last={state.policy.last_allowed_date}
              selected={state.selection.date ?? ''}
              choose={(date) => state.change({ date })}
            />
          )}
          <div
            aria-live="polite"
            aria-busy={state.loading}
          >
            {state.loading && (
              <p
                role="status"
                className="rounded-2xl bg-sand p-5 leading-8"
              >
                در حال دریافت تازه‌ترین زمان‌ها…
              </p>
            )}
            {state.error !== null && (
              <div
                role="alert"
                className="space-y-3 rounded-2xl border border-danger/20 bg-danger-soft p-4 leading-8"
              >
                <p>
                  {state.error instanceof HttpFailure
                    ? state.error.message
                    : 'ارتباط برقرار نشد. دوباره تلاش کنید.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => void state.reload()}
                  >
                    تلاش دوباره
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={state.reset}
                  >
                    بازگشت به تاریخ‌های مجاز
                  </Button>
                </div>
              </div>
            )}
          </div>
          {state.fresh && (
            <>
              <TimeSlots
                slots={state.slots}
                selected={state.chosen?.starts_at}
                select={state.select}
              />
              {state.chosen && (
                <SelectionSummary
                  times={state.fresh.times}
                  slot={state.chosen}
                  date={state.fresh.selection.date}
                  staffName={
                    state.fresh.selection.staff_id === 'any'
                      ? 'اولین متخصص آزاد'
                      : (state.fresh.profile.staff.find(
                          (s) => s.id === state.fresh?.selection.staff_id,
                        )?.display_name ?? 'متخصص انتخاب‌شده')
                  }
                />
              )}
            </>
          )}
          <Button
            variant="secondary"
            className="w-full"
            disabled={state.loading}
            onClick={() => void state.reload()}
          >
            دریافت دوباره زمان‌ها
          </Button>
        </>
      )}
    </article>
  );
}
