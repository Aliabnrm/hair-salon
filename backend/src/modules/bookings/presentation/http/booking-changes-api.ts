import { ApiResponse } from '@nestjs/swagger';
import { appointmentSchema } from './booking-api.js';
const instant = { type: 'string' as const, format: 'date-time' };
const moment = {
  type: 'object' as const,
  nullable: true,
  required: ['starts_at', 'ends_at', 'staff_id', 'staff_name'],
  properties: {
    starts_at: instant,
    ends_at: instant,
    staff_id: { type: 'string' as const, format: 'uuid' },
    staff_name: { type: 'string' as const },
  },
};
export function BookingChangesResult() {
  return ApiResponse({
    status: 200,
    headers: { 'Cache-Control': { schema: { type: 'string', enum: ['no-store'] } } },
    schema: {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: {
          type: 'object',
          required: [
            'appointment',
            'appointment_id',
            'appointment_version',
            'checked_at',
            'change_deadline',
            'customer_can_change',
            'items',
            'has_more',
          ],
          properties: {
            appointment: appointmentSchema,
            appointment_id: { type: 'string', format: 'uuid' },
            appointment_version: { type: 'integer', minimum: 1 },
            checked_at: instant,
            change_deadline: instant,
            customer_can_change: { type: 'boolean' },
            has_more: { type: 'boolean' },
            items: {
              type: 'array',
              maxItems: 50,
              items: {
                type: 'object',
                required: [
                  'version',
                  'action',
                  'actor',
                  'reason',
                  'occurred_at',
                  'before',
                  'after',
                ],
                properties: {
                  version: { type: 'integer', minimum: 1 },
                  action: { type: 'string', enum: ['created', 'cancelled', 'rescheduled'] },
                  actor: { type: 'string', enum: ['customer', 'owner'] },
                  reason: { type: 'string', nullable: true },
                  occurred_at: instant,
                  before: moment,
                  after: moment,
                },
              },
            },
          },
        },
        meta: { type: 'object', properties: { request_id: { type: 'string' } } },
      },
    },
  });
}
export function ReschedulingOptionsResult() {
  return ApiResponse({
    status: 200,
    description:
      'Suggestions only; no hold. Agreed price/duration/buffers; minimum replacement notice 120 minutes.',
    schema: {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: {
          type: 'object',
          required: [
            'business_id',
            'service_id',
            'staff_id',
            'service',
            'staff',
            'appointment_version',
            'timezone',
            'checked_at',
            'availability_basis',
            'booking_enabled',
            'policy',
            'from',
            'to',
            'days',
          ],
          properties: {
            business_id: { type: 'string', format: 'uuid' },
            service_id: { type: 'string', format: 'uuid' },
            staff_id: { type: 'string' },
            service: { $ref: '#/components/schemas/AvailabilityServiceDto' },
            staff: {
              type: 'array',
              maxItems: 50,
              items: {
                type: 'object',
                required: ['id', 'name'],
                properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } },
              },
            },
            appointment_version: { type: 'integer', minimum: 1 },
            timezone: { type: 'string', enum: ['Asia/Tehran'] },
            checked_at: instant,
            availability_basis: { type: 'string', enum: ['live_occupancy'] },
            booking_enabled: { type: 'boolean', enum: [true] },
            policy: {
              type: 'object',
              required: [
                'slot_step_minutes',
                'minimum_notice_minutes',
                'first_allowed_date',
                'last_allowed_date',
              ],
              properties: {
                slot_step_minutes: { type: 'integer', enum: [15] },
                minimum_notice_minutes: { type: 'integer', enum: [120] },
                first_allowed_date: { type: 'string', format: 'date' },
                last_allowed_date: { type: 'string', format: 'date' },
              },
            },
            from: { type: 'string', format: 'date' },
            to: { type: 'string', format: 'date' },
            days: {
              type: 'array',
              maxItems: 7,
              items: { $ref: '#/components/schemas/AvailabilityDayDto' },
            },
          },
        },
        meta: { type: 'object', properties: { request_id: { type: 'string' } } },
      },
    },
  });
}
