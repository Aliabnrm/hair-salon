'use client';
import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import * as api from '../../api/management.api';
import type { SalonService } from '../../model/management.types';
import { toman } from '../../model/form-values';
import { usePaged } from '../../hooks/use-paged';
import { useManagedMutation } from '../../hooks/use-managed-mutation';
import { ManagementFrame } from '../management-frame';
import { LoadState, RequestFeedback } from '../request-feedback';
import { ConfirmAction } from '../confirm-action';
import { Pagination } from '../pagination';
import { ServiceEditor } from './service-editor';
export function ServicesScreen({ businessId }: { businessId: string }) {
  const query = usePaged(businessId, (signal, cursor) =>
    api.listServices(businessId, signal, cursor),
  );
  const [editor, setEditor] = useState<SalonService | 'new' | null>(null),
    mutation = useManagedMutation();
  const refresh = async () => {
    setEditor(null);
    await query.reset();
  };
  const toggle = (service: SalonService) =>
    void mutation.execute(
      JSON.stringify([service.id, service.version, !service.active]),
      (key, signal) =>
        api.updateService(
          businessId,
          service.id,
          { active: !service.active },
          service.version,
          key,
          signal,
        ),
      refresh,
    );
  return (
    <ManagementFrame title="خدمات سالن">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setEditor('new')}
          disabled={mutation.pending || mutation.uncertain}
        >
          خدمت جدید
        </Button>
        <Button
          variant="ghost"
          onClick={() => void refresh()}
        >
          تازه‌سازی فهرست
        </Button>
      </div>
      {editor && (
        <ServiceEditor
          key={editor === 'new' ? 'new' : editor.id}
          businessId={businessId}
          {...(editor === 'new' ? {} : { service: editor })}
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
            {query.data.items.map((service) => (
              <li
                key={service.id}
                className="space-y-2 rounded-2xl border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h2 className="font-bold">{service.name}</h2>
                  <span className="text-sm">{service.active ? 'فعال' : 'آرشیوشده'}</span>
                </div>
                <p className="text-sm text-muted">
                  {toman(service.price_irr)} · {service.duration_minutes.toLocaleString('fa-IR')}{' '}
                  دقیقه
                </p>
                <p className="text-xs text-muted">
                  بافر قبل {service.buffer_before_minutes} و بعد {service.buffer_after_minutes}{' '}
                  دقیقه
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    disabled={mutation.pending || mutation.uncertain}
                    onClick={() => setEditor(service)}
                  >
                    ویرایش {service.name}
                  </Button>
                  <ConfirmAction
                    label={service.active ? 'آرشیو' : 'فعال‌سازی'}
                    disabled={mutation.pending || mutation.uncertain}
                    onConfirm={() => toggle(service)}
                  />
                </div>
              </li>
            ))}
          </ul>
          {!query.data.items.length && <p>هنوز خدمتی ثبت نشده است.</p>}
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
