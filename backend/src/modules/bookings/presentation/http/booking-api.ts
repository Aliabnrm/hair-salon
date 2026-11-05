import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
const uuid = { type: 'string' as const, format: 'uuid' };
const instant = { type: 'string' as const, format: 'date-time' };
const str = { type: 'string' as const };
export const createBookingSchema = {
  type: 'object' as const,
  additionalProperties: false,
  required: [
    'business_id',
    'service_id',
    'staff_id',
    'starts_at',
    'expected_price_irr',
    'expected_duration_minutes',
    'customer_name',
    'customer_mobile',
  ],
  properties: {
    business_id: uuid,
    service_id: uuid,
    staff_id: {
      type: 'string' as const,
      description: 'Eligible staff UUID or any; server assigns deterministically',
    },
    starts_at: instant,
    expected_price_irr: { type: 'integer' as const, minimum: 0, maximum: 10000000000 },
    expected_duration_minutes: { type: 'integer' as const, minimum: 1, maximum: 720 },
    customer_name: { type: 'string' as const, minLength: 2, maxLength: 120 },
    customer_mobile: {
      type: 'string' as const,
      description: 'Required Iranian contact; unverified, never links identity',
    },
  },
};
export const appointmentSchema = {
  type: 'object' as const,
  required: [
    'id',
    'business_id',
    'service_id',
    'staff_id',
    'code',
    'source',
    'status',
    'version',
    'starts_at',
    'ends_at',
    'snapshot',
    'cancelled_at',
    'cancellation_reason',
  ],
  properties: {
    id: uuid,
    business_id: uuid,
    service_id: uuid,
    staff_id: uuid,
    code: str,
    source: { type: 'string' as const, enum: ['online', 'manual'] },
    status: { type: 'string' as const, enum: ['confirmed', 'cancelled'] },
    version: { type: 'integer' as const, minimum: 1 },
    starts_at: instant,
    ends_at: instant,
    cancelled_at: { ...instant, nullable: true },
    cancellation_reason: { ...str, nullable: true },
    snapshot: {
      type: 'object' as const,
      required: [
        'business_name',
        'business_address',
        'business_phone',
        'service_name',
        'staff_name',
        'price_irr',
        'duration_minutes',
        'buffer_before_minutes',
        'buffer_after_minutes',
        'service_version',
        'customer_name',
        'customer_mobile',
        'timezone',
        'policy',
      ],
      properties: {
        business_name: str,
        business_address: { ...str, nullable: true },
        business_phone: { ...str, nullable: true },
        service_name: str,
        staff_name: str,
        price_irr: { type: 'integer' as const, minimum: 0 },
        duration_minutes: { type: 'integer' as const },
        buffer_before_minutes: { type: 'integer' as const },
        buffer_after_minutes: { type: 'integer' as const },
        service_version: { type: 'integer' as const },
        customer_name: str,
        customer_mobile: { ...str, nullable: true },
        timezone: { type: 'string' as const, enum: ['Asia/Tehran'] },
        policy: str,
      },
    },
  },
};
export function BookingResult(status = 200, list = false) {
  return ApiResponse({
    status,
    headers: { 'Cache-Control': { schema: { type: 'string', enum: ['no-store'] } } },
    schema: {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: list
          ? {
              type: 'object',
              required: ['items', 'next_cursor'],
              properties: {
                items: { type: 'array', maxItems: 50, items: appointmentSchema },
                next_cursor: { ...uuid, nullable: true },
              },
            }
          : appointmentSchema,
        meta: { type: 'object', properties: { request_id: str } },
      },
    },
  });
}
export function BookingParams(owner = false, detail = false) {
  return applyDecorators(
    ...(owner ? [ApiParam({ name: 'businessId', format: 'uuid' })] : []),
    ...(detail ? [ApiParam({ name: 'id', format: 'uuid' })] : []),
  );
}
export function BookingList(owner = false) {
  return applyDecorators(
    BookingResult(200, true),
    ApiQuery({ name: 'limit', required: false, type: Number, description: '1..50, default20' }),
    ApiQuery({ name: 'cursor', required: false, format: 'uuid' }),
    ...(owner
      ? [
          ApiQuery({
            name: 'date',
            required: true,
            format: 'date',
            description: 'Tehran calendar day',
          }),
          ApiQuery({ name: 'staff_id', required: false, type: String }),
        ]
      : [ApiQuery({ name: 'period', required: false, enum: ['upcoming', 'past'] })]),
  );
}
export function BookingBody(manual = false) {
  return ApiBody({
    schema: manual
      ? {
          ...createBookingSchema,
          required: createBookingSchema.required.filter(
            (k) => k !== 'customer_mobile' && k !== 'business_id',
          ),
          properties: {
            ...createBookingSchema.properties,
            customer_mobile: { ...str, nullable: true },
            notice_override_reason: {
              ...str,
              minLength: 3,
              maxLength: 300,
              description: 'Required for starts less than 60 minutes ahead; no other override',
            },
          },
        }
      : createBookingSchema,
  });
}
