import { invalid } from '../../../../common/domain/capability-error.js';
import { object, uuid, isoDate } from '../validation.js';
import { addDays, localDate } from './time-range.js';
import type { AvailabilityPolicy, AvailabilityQuery } from './availability.types.js';
import { availabilityLimits } from './availability.types.js';

export function availabilityPolicy(now: Date): AvailabilityPolicy {
  const today = localDate(now);
  return {
    slot_step_minutes: availabilityLimits.slotStepMinutes,
    minimum_notice_minutes: availabilityLimits.minimumNoticeMinutes,
    first_allowed_date: today,
    last_allowed_date: addDays(today, availabilityLimits.horizonDays - 1),
  };
}
export function availabilityQuery(value: unknown, policy: AvailabilityPolicy): AvailabilityQuery {
  const q = object(value, ['service_id', 'staff_id', 'from', 'to']);
  const service_id = uuid(q.service_id, 'service_id').toLowerCase();
  return {
    service_id,
    ...availabilityWindow({ staff_id: q.staff_id, from: q.from, to: q.to }, policy),
  };
}
export function availabilityWindow(
  value: unknown,
  policy: AvailabilityPolicy,
): Omit<AvailabilityQuery, 'service_id'> {
  const q = object(value, ['staff_id', 'from', 'to']);
  const staff_id =
    q.staff_id === undefined || q.staff_id === 'any'
      ? 'any'
      : uuid(q.staff_id, 'staff_id').toLowerCase();
  if ((q.from === undefined) !== (q.to === undefined))
    invalid('from', 'ابتدا و انتهای بازه را مشخص کنید.');
  const from = q.from === undefined ? policy.first_allowed_date : isoDate(q.from, 'from');
  const to =
    q.to === undefined ? addDays(from, availabilityLimits.queryDays - 1) : isoDate(q.to, 'to');
  if (
    from > to ||
    from < policy.first_allowed_date ||
    to > policy.last_allowed_date ||
    to > addDays(from, availabilityLimits.queryDays - 1)
  )
    invalid('from', 'بازه باید حداکثر هفت روز و در سی روز مجاز باشد.');
  return { staff_id, from, to };
}
