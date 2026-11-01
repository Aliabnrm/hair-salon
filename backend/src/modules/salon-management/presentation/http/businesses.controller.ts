import { Body, Controller, Get, Patch, Post, HttpCode, Req, Res } from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { requireCurrentUser, type AuthenticatedRequest } from '../../../identity/public.js';
import { BusinessesService } from '../../application/businesses/businesses.service.js';
import { ManagementHttp, pageQuery } from './management-http.js';
import { ManagementApi, resultSchema } from './management-api.js';
import { BusinessCreateDto, BusinessPatchDto, BusinessResponseDto } from './dto/management.dto.js';
@ManagementApi()
@Controller('')
export class BusinessesController {
  constructor(
    private readonly service: BusinessesService,
    private readonly http: ManagementHttp,
  ) {}
  @Get('me/businesses')
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiResponse({ status: 200, schema: resultSchema(BusinessResponseDto, true) })
  async list(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.list(requireCurrentUser(r).id, pageQuery(r.query)),
    );
  }
  @Post('businesses')
  @HttpCode(201)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', maxLength: 64 },
  })
  @ApiBody({ type: BusinessCreateDto })
  @ApiResponse({
    status: 201,
    schema: resultSchema(BusinessResponseDto, false),
  })
  async create(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() value: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.create(await this.http.command(r, 'business.create', false, false), value),
    );
  }
  @Get('businesses/:businessId/settings')
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiResponse({
    status: 200,
    schema: resultSchema(BusinessResponseDto, false),
  })
  async settings(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.get(requireCurrentUser(r).id, this.http.business(r)),
    );
  }
  @Patch('businesses/:businessId/settings')
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
  @ApiBody({ type: BusinessPatchDto })
  @ApiResponse({
    status: 200,
    schema: resultSchema(BusinessResponseDto, false),
  })
  async update(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() value: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.update(await this.http.command(r, 'business.update', true), value),
    );
  }
}
