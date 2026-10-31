'use client';
import { useState } from 'react';
import { categories, cities, demoSalons } from '../data/demo-salons';
import {
  defaultFilters,
  filterSalons,
  updateFilters,
} from '../model/filter-salons';
import type { DiscoveryFilters } from '../model/discovery.types';

export function useDiscoveryFilters() {
  const [filters, setFilters] = useState(defaultFilters);
  const update = (patch: Partial<DiscoveryFilters>) =>
    setFilters((current) => updateFilters(current, patch));
  const city = cities.find((c) => c.id === filters.cityId) ?? cities[0];
  if (!city) throw new Error('At least one supported demo city is required.');
  return {
    filters,
    update,
    city,
    locationLabel: `${city.name}، ${filters.neighborhood === 'all' ? 'همه محله‌ها' : filters.neighborhood}`,
    visibleCategories: categories.filter(
      (c) => filters.type === 'all' || c.types.includes(filters.type),
    ),
    results: filterSalons(demoSalons, filters),
  };
}
