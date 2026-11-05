import Link from 'next/link';
import { Icon } from '../../../components/ui/icon';
import { buttonStyles } from '../../../components/ui/button';
import { BookingProgress } from '../../../components/ui/booking-progress';
import { PageActionBar } from '../../../components/layout/page-action-bar';
import { PageHeader } from '../../../components/layout/page-header';
import type { PublicProfile as Profile } from '../model/catalog.types';
import { formatPrice } from '../model/format-price';
import { SalonDetails } from './salon-details';
import { SalonServiceCard } from './salon-service-card';

export function PublicProfile({
  profile,
  bookingEnabled = false,
}: {
  profile: Profile;
  bookingEnabled?: boolean;
}) {
  const bookable = profile.services.filter(
    (service) =>
      service.category_id && profile.staff.some((staff) => staff.service_ids.includes(service.id)),
  );
  const minimumPrice = bookable.length
    ? Math.min(...bookable.map((service) => service.price_irr))
    : null;
  return (
    <>
      {bookingEnabled && (
        <PageHeader
          title="معرفی سالن"
          backHref="/"
          backLabel="بازگشت به سالن‌ها"
        />
      )}
      <article className="space-y-7 p-4 pb-8 sm:p-6">
        {bookingEnabled && <BookingProgress step={1} />}
        <header>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-petrol-soft text-petrol">
              <Icon
                name="scissors"
                size={28}
              />
            </span>
            <p className="text-sm text-ink-soft">
              {profile.audience === 'women' ? 'سالن زیبایی بانوان' : 'آرایشگاه مردانه'}
            </p>
          </div>
          <h1 className="break-words text-2xl font-extrabold leading-relaxed sm:text-3xl">
            {profile.name}
          </h1>
          <p className="mt-3 flex items-start gap-2 text-sm leading-7 text-ink-soft">
            <Icon
              name="pin"
              size={18}
              className="mt-1"
            />
            <span>
              {profile.city}
              {profile.district ? `، ${profile.district}` : ''}
            </span>
          </p>
        </header>
        <nav
          aria-label="بخش‌های صفحه سالن"
          className="flex gap-2 border-b border-line pb-3 text-sm font-bold"
        >
          <a
            href="#salon-services"
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center break-words rounded-xl bg-petrol-soft px-2 text-center text-petrol-deep"
          >
            خدمات
          </a>
          <a
            href="#salon-staff"
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center break-words rounded-xl px-2 text-center text-ink-soft hover:bg-sand"
          >
            متخصصان
          </a>
          <a
            href="#salon-information"
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center break-words rounded-xl px-2 text-center text-ink-soft hover:bg-sand"
          >
            اطلاعات سالن
          </a>
        </nav>
        <section
          id="salon-services"
          className="scroll-mt-20"
          aria-labelledby="salon-services-title"
        >
          <h2
            id="salon-services-title"
            className="text-lg font-extrabold"
          >
            خدمات و قیمت‌ها
          </h2>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {bookingEnabled
              ? 'خدمت موردنظرتان را انتخاب کنید تا زمان‌های آزاد را ببینید.'
              : 'خدمات، مدت انجام و قیمت هر خدمت.'}
          </p>
          <ul className="mt-4 space-y-3">
            {profile.services.map((service) => (
              <SalonServiceCard
                key={service.id}
                service={service}
                href={
                  bookingEnabled && bookable.some((item) => item.id === service.id)
                    ? `/salons/${profile.id}/times?${new URLSearchParams({ service_id: service.id })}`
                    : null
                }
              />
            ))}
          </ul>
        </section>
        <section
          id="salon-staff"
          className="scroll-mt-20"
          aria-labelledby="salon-staff-title"
        >
          <h2
            id="salon-staff-title"
            className="mb-4 text-lg font-extrabold"
          >
            متخصصان سالن
          </h2>
          <ul className="divide-y divide-line rounded-3xl border border-line bg-surface px-4">
            {profile.staff.map((staff) => (
              <li
                key={staff.id}
                className="flex items-start gap-3 py-4"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sand text-petrol">
                  <Icon name="user" />
                </span>
                <div className="min-w-0">
                  <h3 className="break-words font-bold leading-7">{staff.display_name}</h3>
                  <p className="mt-1 break-words text-sm leading-7 text-ink-soft">
                    {profile.services
                      .filter((service) => staff.service_ids.includes(service.id))
                      .map((service) => service.name)
                      .join('، ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <SalonDetails profile={profile} />
      </article>
      {bookingEnabled && bookable.length > 0 && (
        <PageActionBar label="رزرو نوبت سالن">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted">شروع قیمت خدمات</p>
            <p className="font-bold">{minimumPrice !== null && formatPrice(minimumPrice)}</p>
          </div>
          <Link
            href={`/salons/${profile.id}/times`}
            className={`${buttonStyles.primary} w-full`}
          >
            انتخاب زمان و رزرو{' '}
            <Icon
              name="forward"
              size={18}
            />
          </Link>
        </PageActionBar>
      )}
    </>
  );
}
