'use client';
import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import * as api from '../../api/management.api';
import { useRemote } from '../../../../lib/hooks/use-remote';
import { ManagementFrame } from '../management-frame';
import { LoadState } from '../request-feedback';
import { HoursEditor } from './hours-editor';
function ScopedHours({ businessId, staffId }: { businessId: string; staffId: string | null }) {
  const [saved, setSaved] = useState(false);
  const query = useRemote(businessId + ':' + staffId, (signal) =>
    api.getHours(businessId, staffId, signal),
  );
  return (
    <>
      {saved && <p role="status">با موفقیت ذخیره شد.</p>}
      <LoadState
        loading={query.loading}
        error={query.error}
        retry={() => void query.reload()}
      />
      {query.data && (
        <>
          <Button
            variant="ghost"
            onClick={() => void query.reload()}
          >
            بارگذاری نسخه تازه برنامه
          </Button>
          <HoursEditor
            key={query.data.version}
            businessId={businessId}
            staffId={staffId}
            hours={query.data}
            onSaved={async () => {
              await query.reload();
              setSaved(true);
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
        ساعت قابل کار متخصص، اشتراک برنامه او و سالن است. تعطیلی سالن مقدم است؛ متخصص تازه بدون
        برنامه، بسته محسوب می‌شود. این صفحه وقت آزاد رزرو تولید نمی‌کند.
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
