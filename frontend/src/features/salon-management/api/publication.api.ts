import { apiRequest } from '../../../lib/api/http-client';
import { array, record, string, number } from '../../../lib/api/response-values';
import { publicationState } from '../model/response-decoders';
import { profile, nullable } from '../../public-catalog/model/catalog-decoders';
import type { Publication } from '../model/publication.types';
export function publication(v: unknown): Publication {
  const p = record(v);
  return {
    state: publicationState(p.state),
    version: number(p.version),
    content_revision: number(p.content_revision),
    request_id: nullable(p.request_id),
    issues: array(p.issues, (v) => {
      const i = record(v);
      return {
        code: string(i.code),
        section: string(i.section),
        field: string(i.field),
        resource_id: nullable(i.resource_id),
        message: string(i.message),
      };
    }),
    history: array(p.history, (v) => {
      const h = record(v);
      return {
        id: string(h.id),
        action: string(h.action),
        revision: number(h.revision),
        request_id: nullable(h.request_id),
        reason: nullable(h.reason),
        created_at: string(h.created_at),
      };
    }),
  };
}
export const getPublication = async (id: string, signal: AbortSignal) =>
  publication(await apiRequest(`/api/v1/businesses/${id}/publication`, { signal }));
export const preview = async (id: string, signal: AbortSignal) =>
  profile(await apiRequest(`/api/v1/businesses/${id}/preview`, { signal }));
export const publicationWrite = async (
  id: string,
  action: 'requests' | 'withdrawals',
  version: number,
  key: string,
  signal: AbortSignal,
) =>
  publication(
    await apiRequest(`/api/v1/businesses/${id}/publication/${action}`, {
      method: 'POST',
      body: action === 'requests' ? { consent: true } : {},
      version,
      idempotencyKey: key,
      signal,
    }),
  );
