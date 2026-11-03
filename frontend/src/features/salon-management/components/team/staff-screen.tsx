'use client';
import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import * as api from '../../api/management.api';
import type { Staff } from '../../model/management.types';
import { usePaged } from '../../hooks/use-paged';
import { useManagedMutation } from '../../hooks/use-managed-mutation';
import { ManagementFrame } from '../management-frame';
import { LoadState, RequestFeedback } from '../request-feedback';
import { ConfirmAction } from '../confirm-action';
import { Pagination } from '../pagination';
import { StaffEditor } from './staff-editor';
export function StaffScreen({ businessId }: { businessId: string }) {
  const query = usePaged(businessId, (signal, cursor) => api.listStaff(businessId, signal, cursor));
  const [editor, setEditor] = useState<Staff | 'new' | null>(null),
    mutation = useManagedMutation();
  const refresh = async () => {
    setEditor(null);
    await query.reset();
  };
  const toggle = (staff: Staff) =>
    void mutation.execute(
      JSON.stringify([staff.id, staff.version, !staff.active]),
      (key, signal) =>
        api.updateStaff(
          businessId,
          staff.id,
          { active: !staff.active },
          staff.version,
          key,
          signal,
        ),
      refresh,
    );
  return (
    <ManagementFrame title="متخصصان سالن">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={mutation.pending || mutation.uncertain}
          onClick={() => setEditor('new')}
        >
          متخصص جدید
        </Button>
        <Button
          variant="ghost"
          onClick={() => void refresh()}
        >
          تازه‌سازی فهرست
        </Button>
      </div>
      {editor && (
        <StaffEditor
          key={editor === 'new' ? 'new' : editor.id}
          businessId={businessId}
          {...(editor === 'new' ? {} : { staff: editor })}
          onSaved={refresh}
          onCancel={() => setEditor(null)}
        />
      )}
      <RequestFeedback mutation={mutation} />
      <LoadState
        loading={query.loading}
        error={query.error}
        retry={() => void query.reload()}
      />
      {query.data && (
        <>
          <ul className="space-y-3">
            {query.data.items.map((staff) => (
              <li
                key={staff.id}
                className="space-y-2 rounded-2xl border border-line bg-surface p-4"
              >
                <h2 className="font-bold">{staff.display_name}</h2>
                <p className="text-sm text-muted">
                  {staff.active ? 'فعال' : 'غیرفعال'} ·{' '}
                  {staff.service_ids.length.toLocaleString('fa-IR')} خدمت تخصیص‌یافته
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    disabled={mutation.pending || mutation.uncertain}
                    onClick={() => setEditor(staff)}
                  >
                    ویرایش {staff.display_name}
                  </Button>
                  <ConfirmAction
                    label={staff.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                    disabled={mutation.pending || mutation.uncertain}
                    onConfirm={() => toggle(staff)}
                  />
                </div>
              </li>
            ))}
          </ul>
          {!query.data.items.length && <p>هنوز متخصصی ثبت نشده است.</p>}
          <Pagination
            hasNext={Boolean(query.data.next_cursor)}
            hasPrevious={query.hasPrevious}
            pending={query.loading}
            next={query.next}
            previous={query.previous}
          />
        </>
      )}
    </ManagementFrame>
  );
}
