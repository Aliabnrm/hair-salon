import { conflict, invalid } from '../../../common/domain/capability-error.js';
import { intersectIntervals, minute } from './schedule-policy.js';
import type {
  Decision,
  PublicationState,
  PublicProfile,
  ReadinessIssue,
} from './publication.types.js';
export function transition(
  state: PublicationState,
  action: 'request' | 'withdraw' | Decision,
): PublicationState {
  if (action === 'request' && (state === 'draft' || state === 'suspended')) return 'pending_review';
  if (action === 'withdraw' && (state === 'pending_review' || state === 'published'))
    return 'draft';
  if (state === 'pending_review' && action === 'approve') return 'published';
  if (state === 'pending_review' && action === 'reject') return 'draft';
  if (state === 'published' && action === 'suspend') return 'suspended';
  return conflict('PUBLICATION_STATE_CONFLICT', 'وضعیت انتشار تغییر کرده یا این اقدام مجاز نیست.');
}
export function readiness(
  profile: PublicProfile,
  ownerActive: boolean,
  serviceMinutes: Record<string, number> = {},
): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  const add = (
    code: string,
    section: string,
    field: string,
    message: string,
    resource_id: string | null = null,
  ) => issues.push({ code, section, field, message, resource_id });
  if (!ownerActive) add('OWNER_REQUIRED', 'settings', 'owner', 'سالن باید مالک فعال داشته باشد.');
  if (profile.name.trim().length < 2 || profile.city.trim().length < 2)
    add('IDENTITY_REQUIRED', 'settings', 'name', 'نام و شهر سالن را تکمیل کنید.');
  if (!profile.public_address?.trim())
    add('ADDRESS_REQUIRED', 'settings', 'public_address', 'آدرس عمومی را وارد کنید.');
  if (!profile.public_phone || !/^\+989\d{9}$/.test(profile.public_phone))
    add('PHONE_REQUIRED', 'settings', 'public_phone', 'موبایل عمومی معتبر وارد کنید.');
  if (!profile.services.length)
    add('SERVICE_REQUIRED', 'services', 'services', 'حداقل یک خدمت فعال اضافه کنید.');
  if (!profile.hours.length)
    add('HOURS_REQUIRED', 'hours', 'intervals', 'ساعات هفتگی سالن را وارد کنید.');
  const workingMinutes = new Map(
    profile.staff.map((staff) => [
      staff.id,
      Math.max(
        0,
        ...staff.hours.flatMap((h) =>
          profile.hours
            .filter((b) => b.weekday === h.weekday)
            .flatMap((b) =>
              intersectIntervals([h], [b]).map(
                (i) => minute(i.end_local, true) - minute(i.start_local),
              ),
            ),
        ),
      ),
    ]),
  );
  for (const service of profile.services) {
    if (!service.category_id)
      add(
        'CATEGORY_REQUIRED',
        'services',
        'category_id',
        `دسته «${service.name}» را تعیین کنید.`,
        service.id,
      );
    const staff = profile.staff.filter((s) => s.service_ids.includes(service.id));
    if (!staff.length)
      add(
        'PUBLIC_STAFF_REQUIRED',
        'staff',
        'public_visible',
        `متخصص فعال و عمومی برای «${service.name}» تعیین کنید.`,
        service.id,
      );
    else if (
      !staff.some(
        (s) =>
          (workingMinutes.get(s.id) ?? 0) >=
          (serviceMinutes[service.id] ?? service.duration_minutes),
      )
    )
      add(
        'HOURS_INTERSECTION_REQUIRED',
        'hours',
        'intervals',
        `بازه مشترک متخصص «${service.name}» با سالن باید برای مدت خدمت و بافرهایش کافی باشد.`,
        service.id,
      );
  }
  for (const staff of profile.staff) {
    const offers = profile.services.filter((service) => staff.service_ids.includes(service.id));
    if (offers.length && !staff.hours.length)
      add(
        'STAFF_HOURS_REQUIRED',
        'hours',
        'intervals',
        `برنامه هفتگی «${staff.display_name}» را تکمیل کنید.`,
        staff.id,
      );
    else if (
      offers.some(
        (service) =>
          (workingMinutes.get(staff.id) ?? 0) <
          (serviceMinutes[service.id] ?? service.duration_minutes),
      )
    )
      add(
        'STAFF_HOURS_INTERSECTION_REQUIRED',
        'hours',
        'intervals',
        `برنامه «${staff.display_name}» با سالن برای خدمات تخصیص‌یافته کافی نیست.`,
        staff.id,
      );
  }
  return issues;
}
export function assertReady(issues: ReadinessIssue[]) {
  if (issues.length) invalid('readiness', 'نقص‌های آمادگی انتشار را برطرف کنید.');
}
export function normalizePersian(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[\u200c\s]+/gu, ' ')
    .trim();
}
