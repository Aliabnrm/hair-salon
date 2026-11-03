import { Body, Controller, Get, Patch, Post, HttpCode, Req, Res } from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { requireCurrentUser, type AuthenticatedRequest } from '../../../identity/public.js';
import { CatalogService } from '../../application/catalog/catalog.service.js';
import { ManagementHttp, pageQuery } from './management-http.js';
import { ManagementApi, resultSchema } from './management-api.js';
import { ServiceCreateDto, ServicePatchDto, ServiceResponseDto } from './dto/management.dto.js';
@ManagementApi()
@Controller('businesses/:businessId')
export class CatalogController {
  constructor(
    private readonly service: CatalogService,
    private readonly http: ManagementHttp,
  ) {}
  @Get('catalog/services')
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiResponse({ status: 200, schema: resultSchema(ServiceResponseDto, true) })
  async list(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.list(requireCurrentUser(r).id, this.http.business(r), pageQuery(r.query)),
    );
  }
  @Get('catalog/services/:id')
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  @ApiResponse({ status: 200, schema: resultSchema(ServiceResponseDto, false) })
  async get(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.get(requireCurrentUser(r).id, this.http.business(r), this.http.id(r)),
    );
  }
  @Post('services')
  @HttpCode(201)
  @ApiParam({ name: 'businessId', format: 'uuid', type: String })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', maxLength: 64 },
  })
  @ApiBody({ type: ServiceCreateDto })
  @ApiResponse({ status: 201, schema: resultSchema(ServiceResponseDto, false) })
  async create(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() value: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.create(await this.http.command(r, 'service.create'), value),
    );
  }
  @Patch('services/:id')
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
  @ApiBody({ type: ServicePatchDto })
  @ApiResponse({ status: 200, schema: resultSchema(ServiceResponseDto, false) })
  async update(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() value: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.update(
        await this.http.command(r, 'service.update', true),
        this.http.id(r),
        value,
      ),
    );
  }
}
