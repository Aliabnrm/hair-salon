import { ApiBody, ApiResponse } from '@nestjs/swagger';
const str = { type: 'string' as const },
  id = { ...str, format: 'uuid' },
  instant = { ...str, format: 'date-time' };
const block = {
  type: 'object' as const,
  required: [
    'id',
    'business_id',
    'staff_id',
    'staff_name',
    'starts_at',
    'ends_at',
    'reason',
    'version',
    'released_at',
    'release_reason',
  ],
  properties: {
    id,
    business_id: id,
    staff_id: id,
    staff_name: str,
    starts_at: instant,
    ends_at: instant,
    reason: str,
    version: { type: 'integer' as const, minimum: 1 },
    released_at: { ...instant, nullable: true },
    release_reason: { ...str, nullable: true },
  },
};
function envelope(data: object) {
  return {
    type: 'object' as const,
    required: ['data', 'meta'],
    properties: { data, meta: { type: 'object' as const, properties: { request_id: str } } },
  };
}
export function BlockResult(status = 200) {
  return ApiResponse({ status, schema: envelope(block) });
}
export function BlockBody() {
  return ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['staff_id', 'starts_at', 'ends_at', 'reason'],
      properties: {
        staff_id: id,
        starts_at: instant,
        ends_at: instant,
        reason: { ...str, minLength: 3, maxLength: 300 },
      },
    },
  });
}
export function OverviewResult() {
  return ApiResponse({
    status: 200,
    schema: envelope({
      type: 'object',
      required: ['checked_at', 'summary', 'blocks', 'blocks_truncated'],
      properties: {
        checked_at: instant,
        summary: {
          type: 'object',
          properties: Object.fromEntries(
            ['total', 'confirmed', 'completed', 'cancelled', 'no_show', 'awaiting_outcome'].map(
              (k) => [k, { type: 'integer', minimum: 0 }],
            ),
          ),
        },
        blocks: { type: 'array', maxItems: 200, items: block },
        blocks_truncated: { type: 'boolean' },
      },
    }),
  });
}
