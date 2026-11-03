import { invalid } from '../../../common/domain/capability-error.js';
import { object, text, integer } from './validation.js';
import type { ServiceInput } from './management.types.js';
export const serviceFields = [
  'category_id',
  'name',
  'price_irr',
  'duration_minutes',
  'buffer_before_minutes',
  'buffer_after_minutes',
] as const;
export function serviceInput(value: unknown): ServiceInput {
  const p = object(value, serviceFields);
  const price = integer(p.price_irr, 'price_irr', 0, 10_000_000_000);
  if (price % 10) invalid('price_irr', 'مبلغ باید مضرب ده ریال باشد.');
  const result = {
    category_id: p.category_id == null ? null : text(p.category_id, 'category_id', 1, 30),
    name: text(p.name, 'name', 2, 120),
    price_irr: price,
    duration_minutes: integer(p.duration_minutes, 'duration_minutes', 1, 720),
    buffer_before_minutes: integer(p.buffer_before_minutes, 'buffer_before_minutes', 0, 240),
    buffer_after_minutes: integer(p.buffer_after_minutes, 'buffer_after_minutes', 0, 240),
  };
  if (result.duration_minutes + result.buffer_before_minutes + result.buffer_after_minutes > 1440)
    invalid('duration_minutes');
  return result;
}
