'use client';
import { useState } from 'react';
import { ActionToast } from '../../../../components/ui/action-toast';
import { Button } from '../../../../components/ui/button';
import * as api from '../../api/management.api';
import { useRemote } from '../../../../lib/hooks/use-remote';
import { ManagementFrame } from '../management-frame';
import { LoadState } from '../request-feedback';
import { HoursEditor } from './hours-editor';
function ScopedHours({ businessId, staffId }: { businessId: string; staffId: string | null }) {
  const [saved, setSaved] = useState(false);
  const [reloadRevision, setReloadRevision] = useState(0);
  const query = useRemote(businessId + ':' + staffId, (signal) =>
    api.getHours(businessId, staffId, signal),
  );
  async function reloadHours() {
    await query.reload();
    setReloadRevision((revision) => revision + 1);
  }
  return (
    <>
      {saved && (
        <ActionToast
          tone="success"
          title="برنامه هفتگی ذخیره شد"
          description={staffId ? 'ساعت‌های کاری متخصص به‌روز شد.' : 'ساعت‌های کاری سالن به‌روز شد.'}
          duration={5000}
          onClose={() => setSaved(false)}
        />
      )}
      <LoadState
        loading={query.loading}
        error={query.error}
        retry={() => void query.reload()}
      />
      {query.data && (
        <>
          <Button
            variant="ghost"
            onClick={() => void reloadHours()}
          >
            بارگذاری نسخه تازه برنامه
          </Button>
          <HoursEditor
            key={`${query.data.version}:${reloadRevision}`}
            businessId={businessId}
            staffId={staffId}
            hours={query.data}
            onReload={() => void reloadHours()}
            onSaving={() => setSaved(false)}
            onSaved={() => {
              setSaved(true);
              void query.reload();
            }}
          />
        </>
      )}
    </>
  );
}
export function HoursScreen({ businessId }: { businessId: string }) {
  const staff = useRemote(businessId, (signal) => api.allStaff(businessId, signal)),
    [selected, setSelected] = useState('');
  return (
    <ManagementFrame title="ساعات کاری">
      <p className="text-sm leading-7 text-muted">
        برنامه کل سالن و هر متخصص را جدا ذخیره کنید. مشتری فقط در بازه مشترک آن‌ها می‌تواند نوبت
        بگیرد. متخصص بدون برنامه، زمان آزاد ندارد؛ تعطیلی سالن بر برنامه متخصص مقدم است.
      </p>
      <label className="block text-sm font-bold">
        برنامه چه کسی؟
        <select
          className="mt-2 h-14 w-full rounded-2xl border border-line-strong bg-surface px-4"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">کل سالن</option>
          {staff.data?.map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.display_name}
              {s.active ? '' : ' (غیرفعال)'}
            </option>
          ))}
        </select>
      </label>
      <LoadState
        loading={staff.loading}
        error={staff.error}
        retry={() => void staff.reload()}
      />
      {staff.data && (
        <ScopedHours
          key={selected}
          businessId={businessId}
          staffId={selected || null}
        />
      )}
    </ManagementFrame>
  );
}
