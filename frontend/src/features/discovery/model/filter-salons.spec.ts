import { describe, expect, it } from 'vitest';
import { demoSalons } from '../data/demo-salons';
import { defaultFilters, filterSalons, updateFilters } from './filter-salons';
describe('discovery fixtures', () => {
  it('combines location, audience, service and Persian keyboard search', () => {
    const filters = {
      ...defaultFilters,
      type: 'women' as const,
      category: 'color' as const,
      query: 'نيلوفر',
    };
    expect(filterSalons(demoSalons, filters).map((s) => s.id)).toEqual([
      'niloufar',
    ]);
    expect(
      filterSalons(demoSalons, { ...filters, neighborhood: 'ونک' }),
    ).toEqual([]);
    expect(
      filterSalons(demoSalons, { ...defaultFilters, query: 'سعادت آباد' }).map(
        (s) => s.id,
      ),
    ).toEqual(['mahour']);
  });
  it('clears an incompatible service when switching audience', () => {
    expect(
      updateFilters({ ...defaultFilters, category: 'nails' }, { type: 'men' })
        .category,
    ).toBeNull();
    expect(
      updateFilters({ ...defaultFilters, category: 'color' }, { type: 'men' })
        .category,
    ).toBe('color');
  });
});
