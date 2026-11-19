import { apiRequest, HttpFailure } from '../../../lib/api/http-client';
import { record, string, number, array, boolean } from '../../../lib/api/response-values';
import { isUuid } from '../../../lib/format/identifier';
import { decodeAppointment } from '../model/booking-values';
import type { ScheduleBlock, BlockInput, AgendaOverview } from '../model/salon-operations';
const base = (b: string) => `/api/v1/businesses/${b}`;
function fail(): never {
  throw new HttpFailure(502, 'INVALID_RESPONSE');
}
function id(v: unknown) {
  const s = string(v);
  return isUuid(s) ? s : fail();
}
function instant(v: unknown) {
  const s = string(v);
  return Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s ? s : fail();
}
export function decodeBlock(v: unknown): ScheduleBlock {
  const b = record(v),
    version = number(b.version),
    start = instant(b.starts_at),
    end = instant(b.ends_at);
  if (![1, 2].includes(version) || end <= start) fail();
  return {
    id: id(b.id),
    business_id: id(b.business_id),
    staff_id: id(b.staff_id),
    staff_name: string(b.staff_name),
    starts_at: start,
    ends_at: end,
    reason: string(b.reason),
    version,
    released_at: b.released_at === null ? null : instant(b.released_at),
    release_reason: b.release_reason === null ? null : string(b.release_reason),
  };
}
export async function agendaOverview(
  b: string,
  q: URLSearchParams,
  signal: AbortSignal,
): Promise<AgendaOverview> {
  const v = record(await apiRequest(base(b) + '/agenda-overview?' + q, { signal })),
    s = record(v.summary),
    count = (k: string) => {
      const n = number(s[k]);
      return n >= 0 ? n : fail();
    };
  const blocks = array(v.blocks, decodeBlock);
  if (blocks.length > 200 || blocks.some((x) => x.business_id !== b)) fail();
  return {
    checked_at: instant(v.checked_at),
    summary: {
      total: count('total'),
      confirmed: count('confirmed'),
      completed: count('completed'),
      cancelled: count('cancelled'),
      no_show: count('no_show'),
      awaiting_outcome: count('awaiting_outcome'),
    },
    blocks,
    blocks_truncated: boolean(v.blocks_truncated),
  };
}
export async function saveOutcome(
  b: string,
  id: string,
  status: 'confirmed' | 'completed' | 'no_show',
  reason: string | null,
  version: number,
  key: string,
  signal: AbortSignal,
) {
  const a = decodeAppointment(
    await apiRequest(base(b) + `/appointments/${id}/outcome`, {
      method: 'POST',
      body: { status, reason },
      version,
      idempotencyKey: key,
      signal,
    }),
  );
  if (a.id !== id || a.business_id !== b) fail();
  return a;
}
export async function createBlock(b: string, input: BlockInput, key: string, signal: AbortSignal) {
  const r = decodeBlock(
    await apiRequest(base(b) + '/schedule-blocks', {
      method: 'POST',
      body: input,
      idempotencyKey: key,
      signal,
    }),
  );
  if (r.business_id !== b) fail();
  return r;
}
export async function releaseBlock(
  b: string,
  id: string,
  reason: string,
  version: number,
  key: string,
  signal: AbortSignal,
) {
  const r = decodeBlock(
    await apiRequest(base(b) + `/schedule-blocks/${id}/release`, {
      method: 'POST',
      body: { reason },
      version,
      idempotencyKey: key,
      signal,
    }),
  );
  if (r.business_id !== b || r.id !== id) fail();
  return r;
}
export function blockIntentResolver(b: string) {
  return async (key: string, operation: 'block-create' | 'block-release', signal: AbortSignal) => {
    const r = decodeBlock(
      await apiRequest(base(b) + `/block-intents/${key}?operation=${operation}`, { signal }),
    );
    if (r.business_id !== b) fail();
    return r;
  };
}
