import type { WeeklyInterval, Interval } from './management.types.js';
export type PublicationState = 'draft' | 'pending_review' | 'published' | 'suspended';
export interface PublicService {
  id: string;
  name: string;
  category_id: string | null;
  price_irr: number;
  duration_minutes: number;
}
export interface PublicStaff {
  id: string;
  display_name: string;
  service_ids: string[];
  hours: WeeklyInterval[];
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
  services: PublicService[];
  staff: PublicStaff[];
  hours: WeeklyInterval[];
  exceptions: {
    local_date: string;
    staff_id: string | null;
    closed: boolean;
    intervals: Interval[];
  }[];
}
export interface ReadinessIssue {
  code: string;
  section: string;
  field: string;
  resource_id: string | null;
  message: string;
}
export interface Publication {
  state: PublicationState;
  version: number;
  content_revision: number;
  request_id: string | null;
  issues: ReadinessIssue[];
  history: {
    id: string;
    action: string;
    revision: number;
    request_id: string | null;
    reason: string | null;
    created_at: string;
  }[];
}
export type Decision = 'approve' | 'reject' | 'suspend';
export interface CatalogQuery {
  q?: string;
  audience?: 'men' | 'women';
  category?: string;
  city?: string;
  district?: string;
  cursor?: string;
  limit: number;
}
export interface SalonSummary {
  id: string;
  name: string;
  audience: 'men' | 'women';
  city: string;
  district: string | null;
  min_price_irr: number;
}
