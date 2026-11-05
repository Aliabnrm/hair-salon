import { Icon } from '../../../components/ui/icon';
import type { PublicProfile as Profile } from '../model/catalog.types';
import { formatPrice } from '../model/format-price';
import { PublicHoursList } from './public-hours';
export function PublicProfile({ profile }: { profile: Profile }) {
  return (
    <article className="space-y-6 p-4 sm:p-6">
      <header className="rounded-3xl border border-petrol/15 bg-petrol-soft p-5">
        <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-surface text-petrol">
          <Icon
            name="scissors"
            size={32}
          />
        </div>
        <p className="text-sm text-petrol-deep">
          {profile.audience === 'women' ? 'سالن زیبایی بانوان' : 'آرایشگاه مردانه'}
        </p>
        <h1 className="mt-2 break-words text-2xl font-extrabold leading-relaxed">{profile.name}</h1>
        <p className="mt-2 text-ink-soft">
          {profile.city}
          {profile.district ? `، ${profile.district}` : ''}
        </p>
        {profile.description && (
          <p className="mt-4 whitespace-pre-wrap break-words leading-8">{profile.description}</p>
        )}
      </header>
      <section className="rounded-3xl border border-line bg-surface p-4">
        <h2 className="mb-4 text-xl font-bold">خدمات و قیمت‌ها</h2>
        <ul className="divide-y divide-line">
          {profile.services.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap justify-between gap-3 py-4"
            >
              <div className="min-w-0">
                <h3 className="break-words font-bold">{s.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {new Intl.NumberFormat('fa').format(s.duration_minutes)} دقیقه
                </p>
              </div>
              <strong className="text-petrol-deep">{formatPrice(s.price_irr)}</strong>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">متخصصان سالن</h2>
        {profile.staff.map((s) => (
          <details
            key={s.id}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <summary className="min-h-11 cursor-pointer break-words font-bold">
              {s.display_name}
            </summary>
            <p className="my-3 text-sm leading-7 text-ink-soft">
              {profile.services
                .filter((x) => s.service_ids.includes(x.id))
                .map((x) => x.name)
                .join('، ')}
            </p>
            <PublicHoursList hours={s.hours} />
          </details>
        ))}
      </section>
      <section className="rounded-3xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-xl font-bold">نشانی و تماس</h2>
        <p className="break-words leading-8">{profile.public_address ?? 'نشانی تکمیل نشده است.'}</p>
        {profile.public_phone && (
          <a
            href={`tel:${profile.public_phone}`}
            dir="ltr"
            className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-petrol px-4 font-bold text-white"
          >
            {profile.public_phone}
          </a>
        )}
      </section>
      <section className="rounded-3xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-xl font-bold">ساعات کاری</h2>
        <p className="mb-4 text-sm leading-7 text-ink-soft">
          ساعات به وقت تهران است؛ برای رزرو، زمان‌های آزاد را بررسی کنید.
        </p>
        <PublicHoursList hours={profile.hours} />
      </section>
      {profile.exceptions.length > 0 && (
        <section className="rounded-3xl border border-line bg-surface p-4">
          <h2 className="mb-3 text-xl font-bold">روزهای خاص در ۹۳ روز آینده</h2>
          <ul className="space-y-3">
            {profile.exceptions.map((e, i) => (
              <li
                key={i}
                className="leading-8"
              >
                <time dateTime={e.local_date}>
                  {new Intl.DateTimeFormat('fa-IR', {
                    dateStyle: 'medium',
                    timeZone: 'Asia/Tehran',
                  }).format(new Date(e.local_date + 'T12:00:00Z'))}
                </time>{' '}
                —{' '}
                {e.staff_id
                  ? profile.staff.find((s) => s.id === e.staff_id)?.display_name
                  : 'کل سالن'}
                :{' '}
                {e.closed
                  ? 'تعطیل'
                  : e.intervals.map((h) => `${h.start_local} تا ${h.end_local}`).join('، ')}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
