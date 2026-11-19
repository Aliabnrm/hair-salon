import { afterEach, it, expect, vi } from 'vitest';
import { apiRequest } from '../../../lib/api/http-client';
import {
  decodeBlock,
  createBlock,
  agendaOverview,
  blockIntentResolver,
} from './salon-operations.api';
const id = '3e70e632-9975-4371-9022-9bfbc5c698c5',
  other = 'fd270fef-e534-477e-a066-edc4700fecc7';
const block = {
  id,
  business_id: id,
  staff_id: id,
  staff_name: 'متخصص',
  starts_at: '2026-11-05T07:00:00.000Z',
  ends_at: '2026-11-05T08:00:00.000Z',
  version: 1,
  reason: 'استراحت',
  released_at: null,
  release_reason: null,
};
afterEach(() => vi.unstubAllGlobals());
it('validates block identifiers, intervals and versions', () => {
  expect(decodeBlock(block)).toEqual(block);
  for (const patch of [{ id: 'bad' }, { version: 0 }, { ends_at: block.starts_at }])
    expect(() => decodeBlock({ ...block, ...patch })).toThrow();
});
it('allows exact operational endpoints, refuses arbitrary suffixes and verifies response tenant', async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ data: block }), { status: 200 })),
    );
  vi.stubGlobal('fetch', fetcher);
  const signal = new AbortController().signal;
  await createBlock(
    id,
    { staff_id: id, starts_at: block.starts_at, ends_at: block.ends_at, reason: block.reason },
    'key',
    signal,
  );
  expect(fetcher).toHaveBeenCalledWith(
    `/api/v1/businesses/${id}/schedule-blocks`,
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': 'key' }),
    }),
  );
  await expect(
    createBlock(
      other,
      { staff_id: id, starts_at: block.starts_at, ends_at: block.ends_at, reason: block.reason },
      'key',
      signal,
    ),
  ).rejects.toThrow();
  await blockIntentResolver(id)('key', 'block-create', signal);
  for (const suffix of [
    '/schedule-blocks/delete',
    '/agenda-overview/extra',
    '/appointments/' + id + '/outcome/extra',
  ])
    await expect(apiRequest('/api/v1/businesses/' + id + suffix)).rejects.toThrow(
      'Unsupported API path.',
    );
});
it('reads aggregate values rather than inferring totals from a page and rejects tenant leaks', async () => {
  const summary = {
    total: 100,
    confirmed: 90,
    completed: 5,
    cancelled: 3,
    no_show: 2,
    awaiting_outcome: 10,
  };
  const fetcher = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            checked_at: block.starts_at,
            summary,
            blocks: [block],
            blocks_truncated: false,
          },
        }),
        { status: 200 },
      ),
    ),
  );
  vi.stubGlobal('fetch', fetcher);
  expect(
    (
      await agendaOverview(
        id,
        new URLSearchParams({ date: '2026-11-05' }),
        new AbortController().signal,
      )
    ).summary,
  ).toEqual(summary);
  await expect(
    agendaOverview(other, new URLSearchParams(), new AbortController().signal),
  ).rejects.toThrow();
});
