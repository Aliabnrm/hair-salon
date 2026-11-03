import { invalid } from '../../../common/domain/capability-error.js';
import { object, text } from './validation.js';
import type { BusinessInput } from './management.types.js';
export const businessFields = [
  'description',
  'name',
  'audience',
  'city',
  'district',
  'public_address',
  'public_phone',
] as const;
export function businessInput(value: unknown): BusinessInput {
  const p = object(value, businessFields);
  if (p.audience !== 'men' && p.audience !== 'women') invalid('audience');
  let phone: string | null = null;
  if (p.public_phone !== undefined && p.public_phone !== null) {
    phone = text(p.public_phone, 'public_phone', 10, 16)
      .replace(/^0098/, '+98')
      .replace(/^0(?=9)/, '+98');
    if (!/^\+989\d{9}$/.test(phone)) invalid('public_phone', 'شماره موبایل ایران وارد کنید.');
  }
  return {
    name: text(p.name, 'name', 2, 120),
    audience: p.audience,
    city: text(p.city, 'city', 2, 80),
    district: p.district == null ? null : text(p.district, 'district', 1, 120),
    public_address:
      p.public_address == null ? null : text(p.public_address, 'public_address', 1, 500),
    public_phone: phone,
    description: p.description == null ? null : text(p.description, 'description', 0, 600) || null,
  };
}
