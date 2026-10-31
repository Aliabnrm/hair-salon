export type SalonType = 'men' | 'women';
export type CategoryId =
  'haircut' | 'beard' | 'color' | 'brushing' | 'keratin' | 'nails' | 'skin';
export interface Category {
  id: CategoryId;
  label: string;
  types: SalonType[];
}
export interface DemoSalon {
  id: string;
  name: string;
  type: SalonType;
  cityId: string;
  neighborhood: string;
  image: string;
  imageAlt: string;
  hours: string;
  services: { name: string; category: CategoryId; price: number }[];
}
export interface DiscoveryFilters {
  cityId: string;
  neighborhood: string;
  type: 'all' | SalonType;
  category: CategoryId | null;
  query: string;
}
