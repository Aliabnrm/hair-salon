import { useId } from 'react';
import { TextField } from '../../../../components/ui/text-field';
import { Icon } from '../../../../components/ui/icon';
import type { BusinessFormValues } from '../../model/business-form-values';

export function BusinessFormFields({
  form,
  fields,
  change,
  disabled,
}: {
  form: BusinessFormValues;
  fields: Record<string, string>;
  change: <K extends keyof BusinessFormValues>(field: K, value: BusinessFormValues[K]) => void;
  disabled: boolean;
}) {
  const addressId = useId();
  const audienceId = useId();
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-6"
    >
      <legend className="sr-only">اطلاعات سالن</legend>
      <section
        aria-labelledby={`${addressId}-main`}
        className="space-y-5 rounded-3xl border border-line bg-surface p-4 sm:p-5"
      >
        <div className="border-b border-line pb-4">
          <h2
            id={`${addressId}-main`}
            className="text-lg font-bold"
          >
            اطلاعات اصلی
          </h2>
          <p className="mt-1 text-sm leading-7 text-ink-soft">
            برای شناخت سالن شما؛ هر سه مورد ضروری‌اند.
          </p>
        </div>
        <TextField
          comfortable
          label="نام سالن"
          name="name"
          value={form.name}
          onChange={(e) => change('name', e.target.value)}
          required
          minLength={2}
          maxLength={120}
          error={fields.name}
          autoComplete="organization"
        />
        <fieldset
          className="min-w-0"
          aria-describedby={fields.audience ? audienceId : undefined}
        >
          <legend className="mb-2 text-base font-bold">نوع سالن</legend>
          <div className="grid grid-cols-2 gap-3">
            {(['women', 'men'] as const).map((audience) => (
              <label
                key={audience}
                className="relative cursor-pointer"
              >
                <input
                  type="radio"
                  name="audience"
                  value={audience}
                  checked={form.audience === audience}
                  onChange={() => change('audience', audience)}
                  aria-invalid={fields.audience ? true : undefined}
                  className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                />
                <span className="flex min-h-14 flex-wrap items-center justify-center gap-2 rounded-2xl border border-muted bg-surface px-3 text-base text-ink-soft transition-colors peer-checked:border-petrol peer-checked:bg-petrol-soft peer-checked:font-bold peer-checked:text-petrol-deep peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-info peer-disabled:opacity-70">
                  {form.audience === audience && (
                    <Icon
                      name="check"
                      size={18}
                    />
                  )}
                  {audience === 'women' ? 'زنانه' : 'مردانه'}
                </span>
              </label>
            ))}
          </div>
          {fields.audience && (
            <p
              id={audienceId}
              className="mt-2 text-sm text-danger"
            >
              {fields.audience}
            </p>
          )}
        </fieldset>
        <TextField
          comfortable
          label="معرفی کوتاه سالن (اختیاری)"
          name="description"
          value={form.description}
          onChange={(e) => change('description', e.target.value)}
          maxLength={600}
          error={fields.description}
          hint="تا ۶۰۰ نویسه؛ این متن پس از تأیید انتشار عمومی خواهد شد."
        />
        <TextField
          comfortable
          label="شهر"
          name="city"
          value={form.city}
          onChange={(e) => change('city', e.target.value)}
          required
          minLength={2}
          maxLength={80}
          error={fields.city}
          autoComplete="address-level2"
        />
      </section>
      <section
        aria-labelledby={`${addressId}-contact`}
        className="space-y-5 rounded-3xl border border-line bg-surface p-4 sm:p-5"
      >
        <div className="border-b border-line pb-4">
          <h2
            id={`${addressId}-contact`}
            className="text-lg font-bold"
          >
            نشانی و اطلاعات تماس <span className="text-sm font-normal text-muted">(اختیاری)</span>
          </h2>
          <p className="mt-1 text-sm leading-7 text-ink-soft">
            می‌توانید این بخش را بعداً تکمیل کنید.
          </p>
        </div>
        <TextField
          comfortable
          label="محله (اختیاری)"
          name="district"
          value={form.district}
          onChange={(e) => change('district', e.target.value)}
          maxLength={120}
          error={fields.district}
          autoComplete="address-level3"
        />
        <div>
          <label
            htmlFor={addressId}
            className="mb-2 block text-base font-bold"
          >
            آدرس عمومی (اختیاری)
          </label>
          <textarea
            id={addressId}
            name="public_address"
            value={form.public_address}
            onChange={(e) => change('public_address', e.target.value)}
            maxLength={500}
            rows={3}
            autoComplete="street-address"
            aria-invalid={fields.public_address ? true : undefined}
            aria-describedby={fields.public_address ? `${addressId}-error` : undefined}
            className={`block min-h-28 w-full resize-y rounded-2xl border bg-surface px-4 py-3 text-base leading-7 disabled:opacity-70 ${fields.public_address ? 'border-danger' : 'border-muted'}`}
          />
          {fields.public_address && (
            <p
              id={`${addressId}-error`}
              className="mt-2 text-sm leading-6 text-danger"
            >
              {fields.public_address}
            </p>
          )}
        </div>
        <TextField
          comfortable
          label="موبایل عمومی سالن (اختیاری)"
          name="public_phone"
          type="tel"
          value={form.public_phone}
          onChange={(e) => change('public_phone', e.target.value)}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          maxLength={16}
          hint="فقط موبایل ایران؛ شماره هنوز تأیید نمی‌شود."
          error={fields.public_phone}
        />
      </section>
    </fieldset>
  );
}
