import { categories } from '../data/demo-salons';
import type { DemoSalon, DiscoveryFilters } from './discovery.types';
export const defaultFilters: DiscoveryFilters = {
  cityId: 'tehran',
  neighborhood: 'all',
  type: 'all',
  category: null,
  query: '',
};
export function normalizePersian(value: string): string {
  return value
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .trim()
    .toLowerCase();
}
export function updateFilters(
  current: DiscoveryFilters,
  patch: Partial<DiscoveryFilters>,
): DiscoveryFilters {
  const next = { ...current, ...patch };
  if (
    next.type !== 'all' &&
    next.category &&
    !categories.find((c) => c.id === next.category)?.types.includes(next.type)
  )
    next.category = null;
  return next;
}
export function filterSalons(
  salons: DemoSalon[],
  filters: DiscoveryFilters,
): DemoSalon[] {
  const query = normalizePersian(filters.query);
  return salons.filter(
    (s) =>
      s.cityId === filters.cityId &&
      (filters.neighborhood === 'all' ||
        s.neighborhood === filters.neighborhood) &&
      (filters.type === 'all' || s.type === filters.type) &&
      (!filters.category ||
        s.services.some((v) => v.category === filters.category)) &&
      (!query ||
        normalizePersian(
          [s.name, s.neighborhood, ...s.services.map((v) => v.name)].join(' '),
        ).includes(query)),
  );
}
export function startingPrice(
  salon: DemoSalon,
  category: DiscoveryFilters['category'],
): string {
  const prices = salon.services
    .filter((s) => !category || s.category === category)
    .map((s) => s.price);
  return new Intl.NumberFormat('fa-IR').format(Math.min(...prices)) + ' تومان';
}
