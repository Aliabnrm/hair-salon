import { TextField } from '../../../components/ui/text-field';
export function ContactFields({
  name,
  mobile,
  setName,
  setMobile,
  manual = false,
  disabled = false,
}: {
  name: string;
  mobile: string;
  setName: (v: string) => void;
  setMobile: (v: string) => void;
  manual?: boolean;
  disabled?: boolean;
}) {
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-4"
    >
      <legend className="mb-4 text-lg font-bold">اطلاعات مراجعه‌کننده</legend>
      <TextField
        label="نام و نام خانوادگی مراجعه‌کننده"
        name="customer_name"
        autoComplete="name"
        minLength={2}
        maxLength={120}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        label={manual ? 'موبایل تماس (اختیاری)' : 'موبایل تماس'}
        name="customer_mobile"
        type="tel"
        dir="ltr"
        autoComplete="tel"
        inputMode="tel"
        maxLength={20}
        required={!manual}
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        hint="برای هماهنگی سالن با شما استفاده می‌شود."
      />
    </fieldset>
  );
}
