import { useState, type FormEvent } from 'react';
import { Button } from '../../../../components/ui/button';
import { TextField } from '../../../../components/ui/text-field';
import * as api from '../../api/management.api';
import type { Staff } from '../../model/management.types';
import { useRemote } from '../../../../lib/hooks/use-remote';
import { useManagedMutation } from '../../hooks/use-managed-mutation';
import { LoadState, RequestFeedback } from '../request-feedback';
export function StaffEditor({
  businessId,
  staff,
  onSaved,
  onCancel,
}: {
  businessId: string;
  staff?: Staff;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const services = useRemote(businessId, (signal) => api.allServices(businessId, signal));
  const [visible, setVisible] = useState(staff?.public_visible ?? false);
  const [name, setName] = useState(staff?.display_name ?? ''),
    [selected, setSelected] = useState(staff?.service_ids ?? []),
    mutation = useManagedMutation();
  const toggle = (id: string) =>
    setSelected((old) => (old.includes(id) ? old.filter((x) => x !== id) : [...old, id]));
  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = { display_name: name, service_ids: selected, public_visible: visible };
    await mutation.execute(
      JSON.stringify([staff?.id, staff?.version, body]),
      (key, signal) =>
        staff
          ? api.updateStaff(businessId, staff.id, body, staff.version, key, signal)
          : api.createStaff(businessId, body, key, signal),
      onSaved,
    );
  }
  return (
    <form
      className="space-y-4 rounded-3xl border border-line bg-surface p-4"
      onSubmit={(e) => void submit(e)}
    >
      <h2 className="text-lg font-bold">{staff ? 'ویرایش متخصص' : 'متخصص جدید'}</h2>
      <fieldset
        disabled={mutation.pending || mutation.uncertain}
        className="space-y-4"
      >
        <TextField
          label="نام نمایشی متخصص"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={80}
          required
          error={mutation.fields.display_name}
        />
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-petrol"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          نمایش نام متخصص در پروفایل عمومی سالن
        </label>
        <p className="text-sm text-muted">این پروفایل، حساب ورود ایجاد نمی‌کند.</p>
        <fieldset className="space-y-2">
          <legend className="font-bold">خدمات قابل انجام</legend>
          <LoadState
            loading={services.loading}
            error={services.error}
            retry={() => void services.reload()}
          />
          {services.data?.map((service) => (
            <label
              key={service.id}
              className="flex min-h-11 items-center gap-3"
            >
              <input
                type="checkbox"
                checked={selected.includes(service.id)}
                disabled={!service.active && !selected.includes(service.id)}
                onChange={() => toggle(service.id)}
                className="size-5 accent-petrol"
              />
              {service.name}
              {!service.active && ' (آرشیوشده)'}
            </label>
          ))}
          {services.data?.length === 0 && (
            <p>خدمتی ندارید؛ می‌توانید فعلاً بدون تخصیص خدمت ذخیره کنید.</p>
          )}
          {mutation.fields.service_ids && (
            <p
              role="alert"
              className="text-sm text-danger"
            >
              {mutation.fields.service_ids}
            </p>
          )}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={services.loading || Boolean(services.error)}
          >
            ذخیره متخصص
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            انصراف
          </Button>
        </div>
      </fieldset>
      <RequestFeedback mutation={mutation} />
    </form>
  );
}
