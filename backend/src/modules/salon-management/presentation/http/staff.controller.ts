import { Body, Controller, Get, Patch, Post, HttpCode, Req, Res } from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { requireCurrentUser, type AuthenticatedRequest } from '../../../identity/public.js';
import { TeamService } from '../../application/team/team.service.js';
import { ManagementHttp, pageQuery } from './management-http.js';
import { ManagementApi, resultSchema } from './management-api.js';
import { StaffCreateDto, StaffPatchDto, StaffResponseDto } from './dto/management.dto.js';
@ManagementApi()
@Controller('businesses/:businessId')
export class StaffController {
  constructor(
    private readonly service: TeamService,
    private readonly http: ManagementHttp,
  ) {}
  @Get('staff')
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiResponse({ status: 200, schema: resultSchema(StaffResponseDto, true) })
  async list(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.list(requireCurrentUser(r).id, this.http.business(r), pageQuery(r.query)),
    );
  }
  @Get('staff/:id')
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  @ApiResponse({ status: 200, schema: resultSchema(StaffResponseDto, false) })
  async get(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.get(requireCurrentUser(r).id, this.http.business(r), this.http.id(r)),
    );
  }
  @Post('staff')
  @HttpCode(201)
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', maxLength: 64 },
  })
  @ApiBody({ type: StaffCreateDto })
  @ApiResponse({ status: 201, schema: resultSchema(StaffResponseDto, false) })
  async create(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() value: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.create(await this.http.command(r, 'staff.create'), value),
    );
  }
  @Patch('staff/:id')
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
  @ApiBody({ type: StaffPatchDto })
  @ApiResponse({ status: 200, schema: resultSchema(StaffResponseDto, false) })
  async update(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() value: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.update(
        await this.http.command(r, 'staff.update', true),
        this.http.id(r),
        value,
      ),
    );
  }
}
