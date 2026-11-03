import { apiRequest } from '../../../lib/api/http-client';
import { record, boolean, string } from '../../../lib/api/response-values';
import { publication } from '../../salon-management/api/publication.api';
import { page, profile } from '../../public-catalog/model/catalog-decoders';
export async function reviewAccess(signal: AbortSignal) {
  return boolean(record(await apiRequest('/api/v1/review/access', { signal })).can_review);
}
export async function reviewQueue(signal: AbortSignal, cursor?: string) {
  return page(
    await apiRequest(
      '/api/v1/review/businesses?limit=50' +
        (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
      { signal },
    ),
    (v) => {
      const p = record(v);
      return { id: string(p.id), name: string(p.name), state: string(p.state) };
    },
  );
}
export async function reviewBusiness(id: string, signal: AbortSignal) {
  const p = record(await apiRequest(`/api/v1/review/businesses/${id}`, { signal }));
  return { publication: publication(p.publication), profile: profile(p.profile) };
}
export async function decide(
  id: string,
  decision: 'approve' | 'reject' | 'suspend',
  requestId: string | null,
  reason: string | null,
  version: number,
  contentRevision: number,
  key: string,
  signal: AbortSignal,
) {
  return publication(
    await apiRequest(`/api/v1/review/businesses/${id}/decisions`, {
      method: 'POST',
      body: { decision, request_id: requestId, reason, content_revision: contentRevision },
      version,
      idempotencyKey: key,
      signal,
    }),
  );
}
