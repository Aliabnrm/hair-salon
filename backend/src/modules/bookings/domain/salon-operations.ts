import { conflict, invalid } from '../../../common/domain/capability-error.js';
import { object, text, uuid } from '../../../common/domain/input.js';
import { MINUTE_MS, localDate, availabilityPolicy } from '../../salon-management/public.js';
import type { Appointment } from './booking.types.js';
export type Outcome = 'confirmed' | 'completed' | 'no_show';
export interface OutcomeInput {
  status: Outcome;
  reason: string | null;
}
export function outcomeInput(value: unknown): OutcomeInput {
  const v = object(value, ['status', 'reason']);
  if (v.status !== 'confirmed' && v.status !== 'completed' && v.status !== 'no_show')
    invalid('status');
  return {
    status: v.status,
    reason: v.reason === undefined || v.reason === null ? null : text(v.reason, 'reason', 3, 300),
  };
}
export function ensureOutcome(
  a: Pick<Appointment, 'status' | 'starts_at' | 'ends_at' | 'version'>,
  input: OutcomeInput,
  version: number,
  now: Date,
) {
  if (a.version !== version)
    conflict('VERSION_CONFLICT', 'اطلاعات تغییر کرده است؛ دوباره دریافت کنید.');
  if (a.status === 'cancelled' || a.status === input.status)
    conflict('INVALID_TRANSITION', 'این تغییر وضعیت مجاز نیست.');
  if (a.status !== 'confirmed' && !input.reason)
    invalid('reason', 'برای اصلاح نتیجه، دلیل بنویسید.');
  if (input.status === 'completed' && now.getTime() < Date.parse(a.ends_at))
    conflict('OUTCOME_TOO_EARLY', 'ثبت انجام خدمت فقط پس از پایان نوبت ممکن است.');
  if (input.status === 'no_show' && now.getTime() < Date.parse(a.starts_at) + 15 * MINUTE_MS)
    conflict('OUTCOME_TOO_EARLY', 'ثبت عدم حضور از ۱۵ دقیقه پس از شروع ممکن است.');
}
export interface BlockInput {
  staff_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
}
function instant(value: unknown, field: string): string {
  const s = text(value, field, 20, 30);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?Z$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString() !== s.replace(/:00Z$/, ':00.000Z')
  )
    invalid(field);
  return new Date(s).toISOString();
}
export function blockInput(value: unknown): BlockInput {
  const v = object(value, ['staff_id', 'starts_at', 'ends_at', 'reason']);
  return {
    staff_id: uuid(v.staff_id, 'staff_id'),
    starts_at: instant(v.starts_at, 'starts_at'),
    ends_at: instant(v.ends_at, 'ends_at'),
    reason: text(v.reason, 'reason', 3, 300),
  };
}
export function ensureBlock(input: BlockInput, now: Date) {
  const start = Date.parse(input.starts_at),
    end = Date.parse(input.ends_at),
    p = availabilityPolicy(now);
  if (
    start < now.getTime() ||
    end <= start ||
    end - start > 1440 * MINUTE_MS ||
    localDate(new Date(end - 1)) > p.last_allowed_date ||
    start % (15 * MINUTE_MS) !== 0 ||
    end % (15 * MINUTE_MS) !== 0
  )
    invalid(
      'starts_at',
      'بازه آینده، با گام ۱۵ دقیقه، حداکثر ۲۴ ساعت و در افق ۳۰ روز انتخاب کنید.',
    );
}
export interface ScheduleBlock {
  id: string;
  business_id: string;
  staff_id: string;
  staff_name: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  version: number;
  released_at: string | null;
  release_reason: string | null;
}
