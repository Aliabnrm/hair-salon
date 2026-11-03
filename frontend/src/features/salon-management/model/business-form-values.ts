import { digits } from '../../../lib/format/digits';
import type { BusinessInput } from './management.types';

export interface BusinessFormValues {
  description: string;
  name: string;
  audience: 'women' | 'men';
  city: string;
  district: string;
  public_address: string;
  public_phone: string;
}
export function businessFormValues(business?: BusinessInput): BusinessFormValues {
  return {
    description: business?.description ?? '',
    name: business?.name ?? '',
    audience: business?.audience ?? 'men',
    city: business?.city ?? '',
    district: business?.district ?? '',
    public_address: business?.public_address ?? '',
    public_phone: business?.public_phone ?? '',
  };
}
export function businessFormInput(form: BusinessFormValues): BusinessInput {
  return {
    ...form,
    district: form.district.trim() || null,
    public_address: form.public_address.trim() || null,
    public_phone: digits(form.public_phone).trim() || null,
  };
}
export function businessFormErrors(form: BusinessFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.name.trim().length < 2) errors.name = 'نام سالن را با حداقل ۲ نویسه وارد کنید.';
  if (form.city.trim().length < 2) errors.city = 'نام شهر را با حداقل ۲ نویسه وارد کنید.';
  return errors;
}
