import { ConsoleLogger, Controller, Get, Param, Req, Res } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AvailabilityService } from '../../application/availability/availability.service.js';
import { SecurityRateLimiter, type AuthenticatedRequest } from '../../../identity/public.js';
import { CapabilityError } from '../../../../common/domain/capability-error.js';
import { ApiErrorDto } from '../../../../common/http/api-error.js';
import { uuid } from '../../domain/validation.js';
import { resultSchema } from './management-api.js';
import { AvailabilityDto, availabilityExample } from './dto/availability.dto.js';

@ApiTags('public-catalog')
@ApiExtraModels(AvailabilityDto)
@Controller('catalog/salons')
export class AvailabilityController {
  constructor(
    private readonly service: AvailabilityService,
    private readonly rate: SecurityRateLimiter,
    private readonly logger: ConsoleLogger,
  ) {}
  @Get(':businessId/availability')
  @ApiOperation({
    summary: 'Schedule-only suggested times; never reserves capacity',
    description:
      'Public, no-store. 180 catalog requests and 60 availability requests per IP/minute. No session required.',
  })
  @ApiParam({ name: 'businessId', format: 'uuid' })
  @ApiQuery({ name: 'service_id', required: true, format: 'uuid' })
  @ApiQuery({
    name: 'staff_id',
    required: false,
    description: 'any (default) or eligible public staff UUID',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    format: 'date',
    description:
      'Inclusive Tehran local date; supply both from/to or neither. Max 7 days within server policy.',
  })
  @ApiQuery({ name: 'to', required: false, type: String, format: 'date' })
  @ApiResponse({
    status: 200,
    schema: {
      ...resultSchema(AvailabilityDto),
      example: {
        data: availabilityExample,
        meta: { request_id: '8bb2655e-6b9b-4514-8378-e08ff8d27f5a' },
      },
    },
    headers: { 'Cache-Control': { schema: { type: 'string', enum: ['no-store'] } } },
  })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 422, type: ApiErrorDto })
  @ApiResponse({
    status: 429,
    type: ApiErrorDto,
    headers: { 'Retry-After': { schema: { type: 'integer', minimum: 1 } } },
  })
  @ApiResponse({ status: 503, type: ApiErrorDto })
  async get(
    @Param('businessId') business: string,
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
  ) {
    s.setHeader('Cache-Control', 'no-store');
    try {
      await this.rate.consume('public-catalog', r.ip ?? 'unknown', 180, 60);
      await this.rate.consume('public-availability', r.ip ?? 'unknown', 60, 60);
      return {
        data: await this.service.get(uuid(business, 'businessId').toLowerCase(), r.query),
        meta: { request_id: r.requestId },
      };
    } catch (error) {
      if (!(error instanceof CapabilityError) || error.status >= 500)
        this.logger.error({ event: 'availability_unavailable', request_id: r.requestId });
      if (error instanceof CapabilityError) throw error;
      throw new CapabilityError(
        503,
        'SERVICE_UNAVAILABLE',
        'دریافت زمان‌ها موقتاً ممکن نیست. دوباره تلاش کنید.',
      );
    }
  }
}
