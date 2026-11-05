import { SelectControl } from '../../../components/ui/select-control';
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
  const services = profile.services.filter((service) => service.category_id);
  const selectedService = services.find((service) => service.id === selection.service_id);
  const staff = profile.staff.filter((member) =>
    member.service_ids.includes(selection.service_id ?? ''),
  );
  const control = 'min-h-13 rounded-2xl border border-line-strong bg-surface py-3 text-base';
  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-4">
      <h2 className="text-lg font-extrabold">خدمت و متخصص</h2>
      <div className="grid gap-4 min-[360px]:grid-cols-2">
        <div className="min-w-0">
          <label
            htmlFor="availability-service"
            className="block text-sm font-bold"
          >
            خدمت
          </label>
          <SelectControl
            id="availability-service"
            className={control}
            containerClassName="mt-2"
            value={selection.service_id ?? ''}
            onChange={(event) => change({ service_id: event.target.value })}
          >
            {!selectedService && <option value={selection.service_id ?? ''}>انتخاب خدمت</option>}
            {services.map((service) => (
              <option
                key={service.id}
                value={service.id}
              >
                {service.name}
              </option>
            ))}
          </SelectControl>
        </div>
        <div className="min-w-0">
          <label
            htmlFor="availability-staff"
            className="block text-sm font-bold"
          >
            متخصص
          </label>
          <SelectControl
            id="availability-staff"
            className={control}
            containerClassName="mt-2"
            value={selection.staff_id ?? 'any'}
            onChange={(event) => change({ staff_id: event.target.value })}
          >
            <option value="any">فرقی ندارد</option>
            {selection.staff_id &&
              selection.staff_id !== 'any' &&
              !staff.some((member) => member.id === selection.staff_id) && (
                <option value={selection.staff_id}>در دسترس نیست</option>
              )}
            {staff.map((member) => (
              <option
                key={member.id}
                value={member.id}
              >
                {member.display_name}
              </option>
            ))}
          </SelectControl>
        </div>
      </div>
      {selectedService && (
        <p className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm text-ink-soft">
          <span>{selectedService.duration_minutes.toLocaleString('fa-IR')} دقیقه</span>
          <strong className="text-petrol-deep">{formatPrice(selectedService.price_irr)}</strong>
        </p>
      )}
    </section>
  );
}
