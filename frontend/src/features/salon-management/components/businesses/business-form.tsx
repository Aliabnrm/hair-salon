'use client';
import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Icon } from '../../../../components/ui/icon';
import type { Business } from '../../model/management.types';
import { useBusinessForm } from '../../hooks/use-business-form';
import { RequestFeedback } from '../request-feedback';
import { BusinessFormFields } from './business-form-fields';

export function BusinessForm({
  business,
  onSaved,
  onReload,
  reloading = false,
}: {
  business?: Business;
  onSaved: (value: Business) => void | Promise<void>;
  onReload?: () => Promise<void>;
  reloading?: boolean;
}) {
  const { form, formRef, fields, dirty, conflict, mutation, change, submit } = useBusinessForm(
    business,
    onSaved,
  );
  const [confirmReload, setConfirmReload] = useState(false);
  const locked = mutation.pending || mutation.uncertain || reloading;
  function requestReload() {
    if (dirty) setConfirmReload(true);
    else void onReload?.();
  }
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => void submit(event)}
      aria-label={business ? 'ویرایش مشخصات سالن' : 'ساخت سالن'}
      aria-busy={mutation.pending || reloading}
      className="space-y-6"
    >
      <BusinessFormFields
        form={form}
        fields={fields}
        change={change}
        disabled={locked}
      />
      <div className="space-y-3">
        <p
          role="status"
          className="text-sm leading-7 text-ink-soft"
        >
          {business
            ? dirty
              ? 'تغییرات شما هنوز ذخیره نشده‌اند.'
              : 'اطلاعات سالن به‌روز است؛ تغییری برای ذخیره ندارید.'
            : 'سالن به‌صورت پیش‌نویس خصوصی ساخته می‌شود.'}
        </p>
        <Button
          type="submit"
          disabled={locked || mutation.waiting || Boolean(business && !dirty) || conflict}
          className="w-full"
        >
          {mutation.pending ? 'در حال ذخیره…' : business ? 'ذخیره تغییرات' : 'ساخت سالن پیش‌نویس'}
          {!mutation.pending && (
            <Icon
              name={business ? 'check' : 'forward'}
              size={18}
            />
          )}
        </Button>
      </div>
      <RequestFeedback
        mutation={mutation}
        showSuccess={!dirty}
        allowRetry={!conflict}
      />
      {onReload && (
        <div
          className={`border-t pt-4 ${conflict ? 'border-warning rounded-2xl bg-warning-soft p-4' : 'border-line'}`}
        >
          {conflict && (
            <p className="mb-3 text-sm leading-7 text-ink">
              اطلاعات سالن در جای دیگری تغییر کرده است. ورودی شما حفظ شده؛ نسخه تازه را دریافت کنید
              و تغییرها را دوباره اعمال کنید.
            </p>
          )}
          {confirmReload ? (
            <div
              role="alert"
              className="space-y-3"
            >
              <p className="text-sm leading-7">
                با دریافت نسخه تازه، تغییرهای ذخیره‌نشده این فرم کنار گذاشته می‌شوند. ادامه می‌دهید؟
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={locked}
                  onClick={() => {
                    setConfirmReload(false);
                    void onReload();
                  }}
                >
                  دریافت نسخه تازه و کنارگذاشتن تغییرها
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmReload(false)}
                >
                  ادامه ویرایش
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant={conflict ? 'secondary' : 'ghost'}
              disabled={locked}
              onClick={requestReload}
            >
              <Icon
                name="refresh"
                size={18}
              />
              {reloading ? 'در حال دریافت نسخه تازه…' : 'بارگذاری نسخه تازه'}
            </Button>
          )}
          {reloading && (
            <p
              role="status"
              className="sr-only"
            >
              در حال دریافت نسخه تازه…
            </p>
          )}
        </div>
      )}
    </form>
  );
}
