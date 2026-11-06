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
export interface BlockInput {
  staff_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
}
export interface AgendaOverview {
  checked_at: string;
  summary: Record<
    'total' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'awaiting_outcome',
    number
  >;
  blocks: ScheduleBlock[];
  blocks_truncated: boolean;
}
