import { SelectControl } from '../../../../components/ui/select-control';
import { useId, useState, type FormEvent } from 'react';
import { TextField } from '../../../../components/ui/text-field';
import { Button } from '../../../../components/ui/button';
import * as api from '../../api/management.api';
import type { SalonService } from '../../model/management.types';
import { tomanToRial, whole } from '../../model/form-values';
import { useManagedMutation } from '../../hooks/use-managed-mutation';
import { useRemote } from '../../../../lib/hooks/use-remote';
import { categories as loadCategories } from '../../../public-catalog';
import { LoadState, RequestFeedback } from '../request-feedback';
export function ServiceEditor({
  businessId,
  service,
  onSaved,
  onCancel,
}: {
  businessId: string;
  service?: SalonService;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const categoryFieldId = useId();
  const categories = useRemote('service-categories', loadCategories);
  const categoriesReady = !categories.loading && !categories.error && categories.data !== null;
  const [form, setForm] = useState({
    category_id: service?.category_id ?? '',
    name: service?.name ?? '',
    price: String((service?.price_irr ?? 0) / 10),
    duration: String(service?.duration_minutes ?? 30),
    before: String(service?.buffer_before_minutes ?? 0),
    after: String(service?.buffer_after_minutes ?? 0),
  });
  const mutation = useManagedMutation();
  const change = (key: keyof typeof form, value: string) =>
    setForm((old) => ({ ...old, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!categoriesReady) return;
    try {
      const body = {
        category_id: form.category_id,
        name: form.name,
        price_irr: tomanToRial(form.price),
        duration_minutes: whole(form.duration, 'duration_minutes', 1, 720),
        buffer_before_minutes: whole(form.before, 'buffer_before_minutes', 0, 240),
        buffer_after_minutes: whole(form.after, 'buffer_after_minutes', 0, 240),
      };
      await mutation.execute(
        JSON.stringify([service?.id, service?.version, body]),
        (key, signal) =>
          service
            ? api.updateService(businessId, service.id, body, service.version, key, signal)
            : api.createService(businessId, body, key, signal),
        onSaved,
      );
    } catch (error) {
      mutation.fail(error);
    }
  }
  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="space-y-4 rounded-3xl border border-line bg-surface p-4"
    >
      <h2 className="text-lg font-bold">{service ? 'ویرایش خدمت' : 'خدمت جدید'}</h2>
      <fieldset
        className="space-y-4"
        disabled={mutation.pending || mutation.uncertain}
      >
        <LoadState
          loading={categories.loading}
          error={categories.error}
          retry={() => void categories.reload()}
        />
        <div className="space-y-2">
          <label
            htmlFor={categoryFieldId}
            className="block font-bold"
          >
            دسته خدمت
          </label>
          <SelectControl
            id={categoryFieldId}
            required
            className="min-h-11 rounded-xl border border-line bg-surface py-3 text-base"
            value={form.category_id}
            onChange={(e) => change('category_id', e.target.value)}
          >
            <option value="">انتخاب دسته</option>
            {categories.data?.map((c) => (
              <option
                key={c.id}
                value={c.id}
              >
                {c.label}
              </option>
            ))}
          </SelectControl>
        </div>
        {mutation.fields.category_id && (
          <p
            role="alert"
            className="text-danger"
          >
            {mutation.fields.category_id}
          </p>
        )}
        <TextField
          label="نام خدمت"
          value={form.name}
          onChange={(e) => change('name', e.target.value)}
          required
          minLength={2}
          maxLength={120}
          error={mutation.fields.name}
        />
        <TextField
          label="قیمت (تومان)"
          value={form.price}
          onChange={(e) => change('price', e.target.value)}
          required
          dir="ltr"
          inputMode="numeric"
          hint="هزینه خدمت مستقل از رایگان‌بودن پلتفرم است."
          error={mutation.fields.price_irr}
        />
        <TextField
          label="مدت خدمت (دقیقه)"
          value={form.duration}
          onChange={(e) => change('duration', e.target.value)}
          required
          inputMode="numeric"
          dir="ltr"
          error={mutation.fields.duration_minutes}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="بافر قبل (دقیقه)"
            value={form.before}
            onChange={(e) => change('before', e.target.value)}
            required
            inputMode="numeric"
            dir="ltr"
            error={mutation.fields.buffer_before_minutes}
          />
          <TextField
            label="بافر بعد (دقیقه)"
            value={form.after}
            onChange={(e) => change('after', e.target.value)}
            required
            inputMode="numeric"
            dir="ltr"
            error={mutation.fields.buffer_after_minutes}
          />
        </div>
        <p className="text-xs leading-6 text-muted">
          بافر، زمان آماده‌سازی قبل یا جمع‌کردن پس از خدمت است. خدمات فعلاً تک‌مرحله‌ای و
          تک‌متخصص‌اند.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={!categoriesReady}
          >
            ذخیره خدمت
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
