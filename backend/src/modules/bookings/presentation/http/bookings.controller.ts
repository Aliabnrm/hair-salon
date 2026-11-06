import { BookingBody, BookingResult, BookingParams, BookingList } from './booking-api.js';
import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  Req,
  UseGuards,
  UseFilters,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import {
  SessionAuthGuard,
  CookieMutationGuard,
  IdentityExceptionFilter,
  requireCurrentUser,
  type AuthenticatedRequest,
} from '../../../identity/public.js';
import { uuid } from '../../../../common/domain/input.js';
import { BookingsService } from '../../application/bookings.service.js';
import { BookingHttp } from './booking-http.js';
@ApiTags('bookings')
@ApiCookieAuth('session')
@ApiResponse({ status: 401, description: 'Session required' })
@ApiResponse({ status: 403, description: 'Origin rejected' })
@ApiResponse({ status: 404, description: 'Resource unavailable to this actor' })
@ApiResponse({
  status: 409,
  description: 'Slot unavailable, stale agreement, cap or idempotency conflict',
})
@ApiResponse({ status: 422, description: 'Invalid allowlisted input' })
@ApiResponse({
  status: 429,
  description: '10 creates per actor/minute; Retry-After',
  headers: { 'Retry-After': { schema: { type: 'integer' } } },
})
@ApiResponse({ status: 503, description: 'Temporary infrastructure failure; retry same intent' })
@UseGuards(SessionAuthGuard, CookieMutationGuard)
@UseFilters(IdentityExceptionFilter)
@Controller('')
export class BookingsController {
  constructor(
    private readonly service: BookingsService,
    private readonly http: BookingHttp,
  ) {}
  @Post('appointments')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @BookingBody()
  @BookingResult(201)
  @ApiOperation({ summary: 'Confirm a customer appointment atomically; no online payment' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async create(@Req() r: AuthenticatedRequest, @Body() value: unknown) {
    return this.http.response(
      r,
      await this.service.create(await this.http.command(r, 'online'), value),
    );
  }
  @Get('me/booking-intents/:key')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'key', type: String })
  @ApiQuery({
    name: 'operation',
    enum: ['online', 'manual', 'cancel', 'customer-cancel', 'reschedule'],
  })
  @BookingResult()
  async resolve(@Req() r: AuthenticatedRequest) {
    return this.http.response(
      r,
      await this.service.resolve(requireCurrentUser(r).id, r.params.key, r.query.operation),
    );
  }
  @Get('me/appointments')
  @Header('Cache-Control', 'no-store')
  @BookingList()
  async mine(@Req() r: AuthenticatedRequest) {
    return this.http.response(r, await this.service.list(requireCurrentUser(r).id, r.query));
  }
  @Get('appointments/:id')
  @Header('Cache-Control', 'no-store')
  @BookingParams(false, true)
  @BookingResult()
  async detail(@Req() r: AuthenticatedRequest) {
    return this.http.response(
      r,
      await this.service.get(requireCurrentUser(r).id, uuid(r.params.id)),
    );
  }
  @Get('businesses/:businessId/appointments')
  @Header('Cache-Control', 'no-store')
  @BookingParams(true)
  @BookingList(true)
  async agenda(@Req() r: AuthenticatedRequest) {
    return this.http.response(
      r,
      await this.service.list(requireCurrentUser(r).id, r.query, uuid(r.params.businessId)),
    );
  }
  @Get('businesses/:businessId/appointments/:id')
  @Header('Cache-Control', 'no-store')
  @BookingParams(true, true)
  @BookingResult()
  async ownerDetail(@Req() r: AuthenticatedRequest) {
    return this.http.response(
      r,
      await this.service.get(
        requireCurrentUser(r).id,
        uuid(r.params.id),
        uuid(r.params.businessId),
      ),
    );
  }
  @Get('businesses/:businessId/booking-options')
  @Header('Cache-Control', 'no-store')
  @BookingParams(true)
  @ApiQuery({ name: 'service_id', format: 'uuid' })
  @ApiQuery({ name: 'staff_id', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, format: 'date' })
  @ApiQuery({ name: 'to', required: false, format: 'date' })
  @ApiResponse({
    status: 200,
    description:
      'Private manual availability; same shape as public AvailabilityDto with notice override candidates',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/AvailabilityDto' },
        meta: { type: 'object', properties: { request_id: { type: 'string' } } },
      },
    },
  })
  async options(@Req() r: AuthenticatedRequest) {
    return this.http.response(
      r,
      await this.service.options(requireCurrentUser(r).id, uuid(r.params.businessId), r.query),
    );
  }
  @Post('businesses/:businessId/appointments')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @BookingParams(true)
  @BookingBody(true)
  @BookingResult(201)
  async manual(@Req() r: AuthenticatedRequest, @Body() value: unknown) {
    return this.http.response(
      r,
      await this.service.create(
        await this.http.command(r, 'manual'),
        value,
        uuid(r.params.businessId),
      ),
    );
  }
  @Post('businesses/:businessId/appointments/:id/cancellation')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'If-Match', required: true })
  @BookingParams(true, true)
  @BookingResult()
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['reason'],
      properties: { reason: { type: 'string', minLength: 3, maxLength: 300 } },
    },
  })
  async cancel(@Req() r: AuthenticatedRequest, @Body() value: unknown) {
    return this.http.response(
      r,
      await this.service.cancel(
        await this.http.command(r, 'cancel'),
        uuid(r.params.businessId),
        uuid(r.params.id),
        value,
        this.http.version(r),
      ),
    );
  }
}
