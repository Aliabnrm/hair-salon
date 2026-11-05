import type { PublicProfile } from '../model/catalog.types';
import { PublicHoursList } from './public-hours';
import { Icon } from '../../../components/ui/icon';
import { persianDate } from '../../../lib/format/local-date';

export function SalonDetails({ profile }: { profile: PublicProfile }) {
  return (
    <section
      id="salon-information"
      className="scroll-mt-20 space-y-4"
      aria-labelledby="salon-information-title"
    >
      <h2
        id="salon-information-title"
        className="text-lg font-extrabold"
      >
        اطلاعات سالن
      </h2>
      <div className="rounded-3xl border border-line bg-surface p-5">
        <div className="flex gap-3">
          <Icon
            name="pin"
            className="mt-1 text-petrol"
          />
          <div className="min-w-0">
            <h3 className="font-bold">نشانی سالن</h3>
            <p className="mt-2 break-words text-sm leading-8 text-ink-soft">
              {profile.public_address ?? 'برای دریافت نشانی با سالن تماس بگیرید.'}
            </p>
          </div>
        </div>
        {profile.public_phone && (
          <a
            href={`tel:${profile.public_phone}`}
            className="mt-4 flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-2xl border border-line px-4 text-sm font-bold text-petrol"
          >
            تماس با سالن <bdi>{profile.public_phone}</bdi>
          </a>
        )}
      </div>
      {profile.description && (
        <details className="rounded-2xl border border-line bg-surface p-4">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-bold">
            درباره سالن{' '}
            <Icon
              name="chevron-down"
              size={18}
            />
          </summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-8 text-ink-soft">
            {profile.description}
          </p>
        </details>
      )}
      <details className="rounded-2xl border border-line bg-surface p-4">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-bold">
          ساعات کاری{' '}
          <Icon
            name="chevron-down"
            size={18}
          />
        </summary>
        <p className="my-3 text-sm leading-7 text-muted">
          به وقت تهران؛ برای رزرو، زمان‌های آزاد را ببینید.
        </p>
        <PublicHoursList hours={profile.hours} />
      </details>
      {profile.exceptions.length > 0 && (
        <details className="rounded-2xl border border-line bg-surface p-4">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-bold">
            تعطیلی‌ها و تغییر ساعت{' '}
            <Icon
              name="chevron-down"
              size={18}
            />
          </summary>
          <ul className="mt-3 divide-y divide-line text-sm">
            {profile.exceptions.map((exception, index) => (
              <li
                key={index}
                className="py-3 leading-8"
              >
                <p className="font-bold">
                  <time dateTime={exception.local_date}>{persianDate(exception.local_date)}</time>
                </p>
                <p className="text-ink-soft">
                  {exception.staff_id
                    ? profile.staff.find((staff) => staff.id === exception.staff_id)?.display_name
                    : 'کل سالن'}
                  :{' '}
                  {exception.closed
                    ? 'تعطیل'
                    : exception.intervals
                        .map((interval) => `${interval.start_local} تا ${interval.end_local}`)
                        .join('، ')}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
