'use client';
import Link from 'next/link';
import type { PublicProfileData } from '../../public-catalog';
import { Button } from '../../../components/ui/button';
import { PageHeader } from '../../../components/layout/page-header';
import { PageActionBar } from '../../../components/layout/page-action-bar';
import { BookingProgress } from '../../../components/ui/booking-progress';
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
    <>
      <PageHeader
        title={state.profile.name}
        backHref={`/salons/${initialProfile.id}`}
        backLabel="بازگشت به صفحه سالن"
      />
      <article className="space-y-6 p-4 pb-8 sm:p-6">
        <BookingProgress step={2} />
        <header>
          <h1 className="text-2xl font-extrabold">انتخاب روز و ساعت</h1>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            خدمت، روز و ساعت مناسب خود را انتخاب کنید.
          </p>
        </header>
        {unavailable ? (
          <section
            role="alert"
            className="rounded-3xl bg-surface p-5 leading-8"
          >
            <p>این سالن یا خدمت در حال حاضر قابل رزرو نیست.</p>
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
              variant="ghost"
              className="w-full text-sm"
              disabled={state.loading}
              onClick={() => void state.reload()}
            >
              تازه‌سازی زمان‌ها
            </Button>
            {!state.chosen && (
              <PageActionBar>
                <p className="text-center text-sm text-ink-soft">
                  برای ادامه، یک ساعت آزاد انتخاب کنید.
                </p>
                <Button
                  className="w-full"
                  disabled
                >
                  انتخاب ساعت
                </Button>
              </PageActionBar>
            )}
          </>
        )}
      </article>
    </>
  );
}
