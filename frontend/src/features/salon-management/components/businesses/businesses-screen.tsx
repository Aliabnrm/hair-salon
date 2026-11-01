'use client';
import Link from 'next/link';
import { buttonStyles } from '../../../../components/ui/button';
import { Icon } from '../../../../components/ui/icon';
import { PrivatePageHeader } from '../../../../components/ui/private-page-header';
import { StatePanel } from '../../../../components/ui/state-panel';
import * as api from '../../api/management.api';
import { usePaged } from '../../hooks/use-paged';
import { FailureNotice } from '../request-feedback';
import { Pagination } from '../pagination';
import { BusinessCard, BusinessListSkeleton } from './business-card';
export function BusinessesScreen() {
  const query = usePaged('my-businesses', api.listBusinesses);
  const empty = query.data?.items.length === 0 && !query.hasPrevious;
  return (
    <div>
      <PrivatePageHeader
        title="سالن‌های من"
        description="سالن خود را انتخاب کنید و به کارها برسید."
        back={{ href: '/account', label: 'حساب کاربری' }}
      />
      <div className="space-y-6 px-4 py-6 sm:px-6">
        {!empty && (
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">سالن‌های شما</h2>
            <Link
              className={buttonStyles.primary}
              href="/manage/new"
            >
              <span aria-hidden="true">+</span>افزودن سالن
            </Link>
          </div>
        )}
        {query.loading ? (
          <BusinessListSkeleton />
        ) : query.error ? (
          <FailureNotice
            error={query.error}
            retry={() => void query.reload()}
          />
        ) : (
          query.data && (
            <>
              {empty ? (
                <StatePanel
                  icon="scissors"
                  title="هنوز سالنی ندارید"
                  description="با نام و شهر سالن شروع کنید؛ اطلاعات تکمیلی را هر زمان خواستید اضافه کنید."
                >
                  <Link
                    className={buttonStyles.primary}
                    href="/manage/new"
                  >
                    ساخت اولین سالن
                    <Icon
                      name="forward"
                      size={18}
                    />
                  </Link>
                </StatePanel>
              ) : (
                <ul className="space-y-3">
                  {query.data.items.map((business) => (
                    <BusinessCard
                      key={business.id}
                      business={business}
                    />
                  ))}
                </ul>
              )}
              <Pagination
                hasNext={Boolean(query.data.next_cursor)}
                hasPrevious={query.hasPrevious}
                pending={query.loading}
                next={query.next}
                previous={query.previous}
              />
            </>
          )
        )}
        <p className="flex items-start gap-2 text-sm leading-7 text-muted">
          <Icon
            name="shield"
            size={18}
            className="mt-1"
          />
          سالن‌ها خصوصی‌اند و هنوز منتشر یا قابل رزرو نیستند.
        </p>
      </div>
    </div>
  );
}
