import type { PublicProfileData } from '../../public-catalog';
import { formatPrice } from '../../public-catalog';
import type { TimeSelection } from '../model/availability.types';

export function ServiceStaffPicker({
  profile,
  selection,
  change,
}: {
  profile: PublicProfileData;
  selection: TimeSelection;
  change: (patch: TimeSelection) => void;
}) {
  const services = profile.services.filter((s) => s.category_id);
  const staff = profile.staff.filter((s) => s.service_ids.includes(selection.service_id ?? ''));
  const control =
    'mt-2 min-h-13 w-full min-w-0 rounded-2xl border border-line-strong bg-surface px-3 py-3 text-base';
  return (
    <section className="space-y-5 rounded-3xl border border-line bg-surface p-4 shadow-card">
      <h2 className="text-lg font-bold">۱. خدمت و متخصص</h2>
      <div>
        <label
          htmlFor="availability-service"
          className="block font-bold"
        >
          خدمت
        </label>
        <select
          id="availability-service"
          className={control}
          value={selection.service_id ?? ''}
          onChange={(e) => change({ service_id: e.target.value })}
        >
          {!services.some((s) => s.id === selection.service_id) && (
            <option value={selection.service_id ?? ''}>خدمت را انتخاب کنید</option>
          )}
          {services.map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.name} · {s.duration_minutes.toLocaleString('fa-IR')} دقیقه ·{' '}
              {formatPrice(s.price_irr)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="availability-staff"
          className="block font-bold"
        >
          متخصص
        </label>
        <select
          id="availability-staff"
          className={control}
          value={selection.staff_id ?? 'any'}
          onChange={(e) => change({ staff_id: e.target.value })}
        >
          <option value="any">اولین متخصص آزاد</option>
          {selection.staff_id &&
            selection.staff_id !== 'any' &&
            !staff.some((s) => s.id === selection.staff_id) && (
              <option value={selection.staff_id}>متخصص انتخاب‌شده در دسترس نیست</option>
            )}
          {staff.map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.display_name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm leading-7 text-ink-soft">
        در انتخاب اولین متخصص آزاد، نام متخصص نهایی هنگام ثبت نوبت در آینده مشخص می‌شود.
      </p>
    </section>
  );
}
