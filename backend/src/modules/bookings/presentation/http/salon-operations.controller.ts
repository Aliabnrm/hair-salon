import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  Header,
  Req,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiHeader,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import {
  SessionAuthGuard,
  CookieMutationGuard,
  IdentityExceptionFilter,
  requireCurrentUser,
  type AuthenticatedRequest,
} from '../../../identity/public.js';
import { uuid } from '../../../../common/domain/input.js';
import { SalonOperationsService } from '../../application/salon-operations.service.js';
import { BookingHttp } from './booking-http.js';
import { BookingParams, BookingResult } from './booking-api.js';
import { BlockResult, OverviewResult, BlockBody } from './salon-operations-api.js';
@ApiTags('salon-operations')
@ApiCookieAuth('session')
@ApiResponse({ status: 401, description: 'Session required' })
@ApiResponse({ status: 403, description: 'Origin rejected' })
@ApiResponse({ status: 404, description: 'Owner/resource unavailable' })
@ApiResponse({ status: 409, description: 'Overlap, transition or version conflict' })
@ApiResponse({ status: 422, description: 'Invalid allowlisted input' })
@ApiResponse({ status: 428, description: 'If-Match required' })
@ApiResponse({ status: 429, description: '30 changes per actor/minute' })
@UseGuards(SessionAuthGuard, CookieMutationGuard)
@UseFilters(IdentityExceptionFilter)
@Controller('businesses/:businessId')
export class SalonOperationsController {
  constructor(
    private readonly service: SalonOperationsService,
    private readonly http: BookingHttp,
  ) {}
  @Get('agenda-overview')
  @Header('Cache-Control', 'no-store')
  @BookingParams(true)
  @ApiQuery({ name: 'date', format: 'date' })
  @ApiQuery({ name: 'to', required: false, format: 'date' })
  @ApiQuery({ name: 'staff_id', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['any', 'confirmed', 'cancelled', 'completed', 'no_show'],
  })
  @OverviewResult()
  @ApiOperation({
    summary:
      'Owner seven-day bounded summary (before status filter/pagination) and private block history',
  })
  overview(@Req() r: AuthenticatedRequest) {
    return this.service
      .overview(requireCurrentUser(r).id, uuid(r.params.businessId), r.query)
      .then((data) => this.http.response(r, data));
  }
  @Post('appointments/:id/outcome')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @BookingParams(true, true)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'If-Match', required: true })
  @BookingResult()
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['confirmed', 'completed', 'no_show'] },
        reason: {
          type: 'string',
          nullable: true,
          minLength: 3,
          maxLength: 300,
          description: 'Required when correcting a previously recorded result',
        },
      },
    },
  })
  async outcome(@Req() r: AuthenticatedRequest, @Body() v: unknown) {
    return this.http.response(
      r,
      await this.service.outcome(
        await this.http.command(r, 'outcome'),
        uuid(r.params.businessId),
        uuid(r.params.id),
        v,
        this.http.version(r),
      ),
    );
  }
  @Post('schedule-blocks')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @BookingParams(true)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @BlockBody()
  @BlockResult(201)
  async create(@Req() r: AuthenticatedRequest, @Body() v: unknown) {
    return this.http.response(
      r,
      await this.service.createBlock(
        await this.http.command(r, 'block-create'),
        uuid(r.params.businessId),
        v,
      ),
    );
  }
  @Post('schedule-blocks/:id/release')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @BookingParams(true, true)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'If-Match', required: true })
  @BlockResult()
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['reason'],
      properties: { reason: { type: 'string', minLength: 3, maxLength: 300 } },
    },
  })
  async release(@Req() r: AuthenticatedRequest, @Body() v: unknown) {
    return this.http.response(
      r,
      await this.service.releaseBlock(
        await this.http.command(r, 'block-release'),
        uuid(r.params.businessId),
        uuid(r.params.id),
        v,
        this.http.version(r),
      ),
    );
  }
  @Get('block-intents/:key')
  @Header('Cache-Control', 'no-store')
  @BookingParams(true)
  @ApiParam({ name: 'key', type: String })
  @ApiQuery({ name: 'operation', enum: ['block-create', 'block-release'] })
  @BlockResult()
  async resolve(@Req() r: AuthenticatedRequest) {
    return this.http.response(
      r,
      await this.service.resolveBlock(
        requireCurrentUser(r).id,
        uuid(r.params.businessId),
        r.params.key,
        r.query.operation,
      ),
    );
  }
}
