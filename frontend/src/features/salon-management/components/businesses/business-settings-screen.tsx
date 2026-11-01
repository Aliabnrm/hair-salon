'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrivatePageHeader } from '../../../../components/ui/private-page-header';
import { useBusinessSettings } from '../../hooks/use-business-settings';
import { FailureNotice, LoadState } from '../request-feedback';
import { ManagementNavigation } from '../management-navigation';
import { BusinessForm } from './business-form';
import { DraftBadge } from './draft-badge';

export function NewBusinessScreen() {
  const router = useRouter();
  return (
    <div>
      <PrivatePageHeader
        title="سالن خودت را اضافه کن"
        description="از اطلاعات اصلی شروع کنید؛ سالن فعلاً خصوصی می‌ماند."
        back={{ href: '/manage', label: 'سالن‌های من' }}
      />
      <div className="px-4 py-6 sm:px-6">
        <BusinessForm onSaved={(value) => router.push(`/manage/${value.id}`)} />
      </div>
    </div>
  );
}
export function BusinessSettingsScreen({ businessId }: { businessId: string }) {
  const query = useBusinessSettings(businessId);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  return (
    <div>
      <PrivatePageHeader
        title={query.data?.name ?? 'مدیریت سالن'}
        description={
          query.data
            ? `${query.data.city} · سالن ${query.data.audience === 'women' ? 'زنانه' : 'مردانه'}`
            : 'مشخصات و اطلاعات سالن شما'
        }
        back={{ href: '/manage', label: 'سالن‌های من' }}
      >
        {query.data && (
          <div className="mt-3">
            <DraftBadge />
          </div>
        )}
      </PrivatePageHeader>
      <ManagementNavigation
        businessId={businessId}
        embedded
      />
      <section className="space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h2 className="text-xl font-bold">مشخصات سالن</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            این پیش‌نویس خصوصی است و هنوز منتشر یا قابل رزرو نیست.
          </p>
        </div>
        <LoadState
          loading={query.loading && !query.data}
          error={!query.data ? query.error : null}
          retry={() => void query.reload()}
        />
        {query.data && query.error !== null && <FailureNotice error={query.error} />}
        {savedVersion === query.data?.version && (
          <p
            role="status"
            className="rounded-2xl bg-success-soft p-4 text-sm text-success"
          >
            مشخصات ذخیره شد.
          </p>
        )}
        {query.data && (
          <BusinessForm
            key={`${query.formRevision}:${query.data.version}`}
            business={query.data}
            reloading={query.loading}
            onSaved={(value) => {
              query.acceptSaved(value);
              setSavedVersion(value.version);
            }}
            onReload={async () => {
              setSavedVersion(null);
              await query.reload();
            }}
          />
        )}
      </section>
    </div>
  );
}
