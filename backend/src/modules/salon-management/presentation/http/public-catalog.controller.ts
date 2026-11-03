import { Controller, Get, Req, Res, UseFilters } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiExtraModels, ApiQuery, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import { PublicCatalogService } from '../../application/public-catalog.service.js';
import {
  SecurityRateLimiter,
  IdentityExceptionFilter,
  type AuthenticatedRequest,
} from '../../../identity/public.js';
import { uuid, object } from '../../domain/validation.js';
import { catalogQuery } from '../../domain/catalog-query.js';
import { resultSchema } from './management-api.js';
import {
  PublicProfileDto,
  SalonSummaryDto,
  CategoryDto,
  LocationDto,
} from './dto/publication.dto.js';
@ApiTags('public-catalog')
@ApiExtraModels(PublicProfileDto, SalonSummaryDto, CategoryDto, LocationDto)
@UseFilters(IdentityExceptionFilter)
@Controller('catalog')
export class PublicCatalogController {
  constructor(
    private readonly service: PublicCatalogService,
    private readonly rate: SecurityRateLimiter,
  ) {}
  private async respond(r: AuthenticatedRequest, s: Response, load: () => Promise<unknown>) {
    s.setHeader('Cache-Control', 'no-store');
    await this.rate.consume('public-catalog', r.ip ?? 'unknown', 180, 60);
    return { data: await load(), meta: { request_id: r.requestId } };
  }
  @Get('categories')
  @ApiResponse({ status: 200, schema: resultSchema(CategoryDto, true) })
  categories(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    object(r.query, []);
    return this.respond(r, s, async () => ({
      items: await this.service.categories(),
      next_cursor: null,
    }));
  }
  @Get('locations')
  @ApiResponse({ status: 200, schema: resultSchema(LocationDto, true) })
  locations(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    object(r.query, []);
    return this.respond(r, s, async () => ({
      items: await this.service.locations(),
      next_cursor: null,
    }));
  }
  @Get('salons')
  @ApiQuery({ name: 'q', required: false, maxLength: 100 })
  @ApiQuery({ name: 'audience', required: false, enum: ['men', 'women'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'city', required: false, maxLength: 80 })
  @ApiQuery({ name: 'district', required: false, maxLength: 120 })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, schema: resultSchema(SalonSummaryDto, true) })
  list(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    const q = catalogQuery(r.query);
    return this.respond(r, s, () => this.service.list(q));
  }
  @Get('salons/:businessId')
  @ApiParam({ name: 'businessId', format: 'uuid' })
  @ApiResponse({ status: 200, schema: resultSchema(PublicProfileDto) })
  profile(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    object(r.query, []);
    const id = uuid(r.params.businessId, 'businessId');
    return this.respond(r, s, () => this.service.profile(id));
  }
}
