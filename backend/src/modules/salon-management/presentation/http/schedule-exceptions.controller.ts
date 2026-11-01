import { Body, Controller, Delete, Get, Patch, Post, HttpCode, Req, Res } from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { requireCurrentUser, type AuthenticatedRequest } from '../../../identity/public.js';
import { SchedulingService } from '../../application/scheduling/scheduling.service.js';
import { ManagementHttp, pageQuery } from './management-http.js';
import { ManagementApi, resultSchema } from './management-api.js';
import {
  ExceptionCreateDto,
  ExceptionPatchDto,
  ExceptionResponseDto,
} from './dto/management.dto.js';
@ManagementApi()
@Controller('businesses/:businessId')
export class ScheduleExceptionsController {
  constructor(
    private readonly service: SchedulingService,
    private readonly http: ManagementHttp,
  ) {}
  @Get('schedule-exceptions')
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'from', type: String, format: 'date' })
  @ApiQuery({ name: 'to', type: String, format: 'date' })
  @ApiQuery({ name: 'staff_id', required: false, type: String, format: 'uuid' })
  @ApiResponse({
    status: 200,
    schema: resultSchema(ExceptionResponseDto, true),
  })
  async list(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.exceptions(
        requireCurrentUser(r).id,
        this.http.business(r),
        pageQuery(r.query, true),
      ),
    );
  }
  @Post('schedule-exceptions')
  @HttpCode(201)
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', maxLength: 64 },
  })
  @ApiBody({ type: ExceptionCreateDto })
  @ApiResponse({
    status: 201,
    schema: resultSchema(ExceptionResponseDto, false),
  })
  async create(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() value: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.create(await this.http.command(r, 'exception.create'), value),
    );
  }
  @Patch('schedule-exceptions/:id')
  @HttpCode(200)
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
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
  @ApiBody({ type: ExceptionPatchDto })
  @ApiResponse({
    status: 200,
    schema: resultSchema(ExceptionResponseDto, false),
  })
  async update(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() value: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.update(
        await this.http.command(r, 'exception.update', true),
        this.http.id(r),
        value,
      ),
    );
  }
  @Delete('schedule-exceptions/:id')
  @HttpCode(200)
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
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
  @ApiResponse({
    status: 200,
    schema: resultSchema(ExceptionResponseDto, false),
  })
  async remove(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.remove(
        await this.http.command(r, 'exception.remove', true),
        this.http.id(r),
      ),
    );
  }
}
