export interface Category {
  id: string;
  label: string;
}
export interface Location {
  city: string;
  districts: string[];
}
export interface SalonSummary {
  id: string;
  name: string;
  audience: 'men' | 'women';
  city: string;
  district: string | null;
  min_price_irr: number;
}
export interface PublicHours {
  weekday: number;
  start_local: string;
  end_local: string;
}
export interface PublicProfile {
  id: string;
  name: string;
  description: string | null;
  audience: 'men' | 'women';
  city: string;
  district: string | null;
  public_address: string | null;
  public_phone: string | null;
  timezone: string;
  services: {
    id: string;
    name: string;
    category_id: string | null;
    price_irr: number;
    duration_minutes: number;
  }[];
  staff: { id: string; display_name: string; service_ids: string[]; hours: PublicHours[] }[];
  hours: PublicHours[];
  exceptions: {
    local_date: string;
    staff_id: string | null;
    closed: boolean;
    intervals: { start_local: string; end_local: string }[];
  }[];
}
export interface CatalogPage {
  items: SalonSummary[];
  next_cursor: string | null;
}
