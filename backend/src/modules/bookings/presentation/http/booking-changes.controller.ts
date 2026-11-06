import { BookingChangesResult, ReschedulingOptionsResult } from './booking-changes-api.js';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiHeader,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import {
  SessionAuthGuard,
  CookieMutationGuard,
  IdentityExceptionFilter,
  requireCurrentUser,
  type AuthenticatedRequest,
} from '../../../identity/public.js';
import { uuid } from '../../../../common/domain/input.js';
import { BookingChangesService } from '../../application/booking-changes.service.js';
import { BookingHttp } from './booking-http.js';
import { BookingParams, BookingResult } from './booking-api.js';
@ApiTags('bookings')
@ApiCookieAuth('session')
@UseGuards(SessionAuthGuard, CookieMutationGuard)
@UseFilters(IdentityExceptionFilter)
@ApiResponse({ status: 401, description: 'Session required' })
@ApiResponse({ status: 403, description: 'Origin rejected' })
@ApiResponse({ status: 422, description: 'Allowlisted input invalid' })
@ApiResponse({ status: 428, description: 'If-Match required for mutation' })
@ApiResponse({
  status: 429,
  description: '30 changes per actor/minute',
  headers: { 'Retry-After': { schema: { type: 'integer' } } },
})
@ApiResponse({ status: 503, description: 'Temporary failure; retain intent key' })
@ApiResponse({ status: 404, description: 'Appointment unavailable to this actor' })
@ApiResponse({ status: 409, description: 'Deadline, version, slot or idempotency conflict' })
@Controller('')
export class BookingChangesController {
  constructor(
    private readonly service: BookingChangesService,
    private readonly http: BookingHttp,
  ) {}
  @BookingChangesResult()
  @Get('appointments/:id/changes')
  @Header('Cache-Control', 'no-store')
  @BookingParams(false, true)
  @ApiOperation({
    summary: 'Customer change policy and last 50 immutable events; no actor identifiers',
  })
  changes(@Req() r: AuthenticatedRequest) {
    return this.service
      .changes(requireCurrentUser(r).id, uuid(r.params.id))
      .then((data) => this.http.response(r, data));
  }
  @BookingChangesResult()
  @Get('businesses/:businessId/appointments/:id/changes')
  @Header('Cache-Control', 'no-store')
  @BookingParams(true, true)
  @ApiOperation({ summary: 'Owner-visible appointment history' })
  ownerChanges(@Req() r: AuthenticatedRequest) {
    return this.service
      .changes(requireCurrentUser(r).id, uuid(r.params.id), uuid(r.params.businessId))
      .then((data) => this.http.response(r, data));
  }
  @ReschedulingOptionsResult()
  @Get('appointments/:id/rescheduling-options')
  @Header('Cache-Control', 'no-store')
  @BookingParams(false, true)
  @ApiQuery({ name: 'staff_id', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'to', required: false, type: String, format: 'date' })
  @ApiOperation({
    summary:
      'Live replacement availability using agreed price/duration/buffers and excluding own allocation',
  })
  options(@Req() r: AuthenticatedRequest) {
    return this.service
      .options(requireCurrentUser(r).id, uuid(r.params.id), r.query)
      .then((data) => this.http.response(r, data));
  }
  @Post('appointments/:id/cancellation')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @BookingParams(false, true)
  @BookingResult()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['reason'],
      properties: { reason: { type: 'string', minLength: 3, maxLength: 300 } },
    },
  })
  @ApiOperation({ summary: 'Customer cancels own online appointment until two hours before start' })
  async cancel(@Req() r: AuthenticatedRequest, @Body() body: unknown) {
    return this.http.response(
      r,
      await this.service.cancel(
        await this.http.command(r, 'customer-cancel'),
        uuid(r.params.id),
        body,
        this.http.version(r),
      ),
    );
  }
  @Post('appointments/:id/rescheduling')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @BookingParams(false, true)
  @BookingResult()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['starts_at', 'staff_id'],
      properties: {
        starts_at: { type: 'string', format: 'date-time' },
        staff_id: { type: 'string' },
      },
    },
  })
  @ApiOperation({
    summary: 'Atomically reschedule the same appointment; preserve old allocation on failure',
  })
  async reschedule(@Req() r: AuthenticatedRequest, @Body() body: unknown) {
    return this.http.response(
      r,
      await this.service.reschedule(
        await this.http.command(r, 'reschedule'),
        uuid(r.params.id),
        body,
        this.http.version(r),
      ),
    );
  }
}
