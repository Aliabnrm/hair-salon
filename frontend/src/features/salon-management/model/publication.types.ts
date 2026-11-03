import type { Business } from './management.types';
export interface Publication {
  state: Business['state'];
  version: number;
  content_revision: number;
  request_id: string | null;
  issues: {
    code: string;
    section: string;
    field: string;
    resource_id: string | null;
    message: string;
  }[];
  history: {
    id: string;
    action: string;
    revision: number;
    request_id: string | null;
    reason: string | null;
    created_at: string;
  }[];
}
