import { Body, Controller, Get, Put, HttpCode, Req, Res } from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { Response } from 'express';
import { requireCurrentUser, type AuthenticatedRequest } from '../../../identity/public.js';
import { SchedulingService } from '../../application/scheduling/scheduling.service.js';
import { ManagementHttp } from './management-http.js';
import { ManagementApi, resultSchema } from './management-api.js';
import { HoursRequestDto, HoursResponseDto } from './dto/management.dto.js';
@ManagementApi()
@Controller('businesses/:businessId')
export class HoursController {
  constructor(
    private readonly service: SchedulingService,
    private readonly http: ManagementHttp,
  ) {}
  @Get('hours')
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiResponse({ status: 200, schema: resultSchema(HoursResponseDto, false) })
  async hours(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.hours(requireCurrentUser(r).id, this.http.business(r), null),
    );
  }
  @Put('hours')
  @HttpCode(200)
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', maxLength: 64 },
  })
  @ApiHeader({
    name: 'If-Match',
    required: true,
    schema: { type: 'string', example: '"1"' },
  })
  @ApiBody({ type: HoursRequestDto })
  @ApiResponse({ status: 200, schema: resultSchema(HoursResponseDto, false) })
  async replace(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() value: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.replace(await this.http.command(r, 'hours.replace', true), null, value),
    );
  }
  @Get('staff/:staffId/hours')
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiParam({ name: 'staffId', format: 'uuid', type: String })
  @ApiResponse({ status: 200, schema: resultSchema(HoursResponseDto, false) })
  async staffHours(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.hours(
        requireCurrentUser(r).id,
        this.http.business(r),
        this.http.id(r, 'staffId'),
      ),
    );
  }
  @Put('staff/:staffId/hours')
  @HttpCode(200)
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiParam({ name: 'staffId', format: 'uuid', type: String })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', maxLength: 64 },
  })
  @ApiHeader({
    name: 'If-Match',
    required: true,
    schema: { type: 'string', example: '"1"' },
  })
  @ApiBody({ type: HoursRequestDto })
  @ApiResponse({ status: 200, schema: resultSchema(HoursResponseDto, false) })
  async replaceStaffHours(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() value: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.replace(
        await this.http.command(r, 'staff-hours.replace', true),
        this.http.id(r, 'staffId'),
        value,
      ),
    );
  }
}
