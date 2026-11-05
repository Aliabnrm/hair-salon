import { Body, Controller, Get, Post, HttpCode, Req, Res } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiResponse, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { requireCurrentUser, type AuthenticatedRequest } from '../../../identity/public.js';
import { PublicationService } from '../../application/publication.service.js';
import { ManagementApi, resultSchema } from './management-api.js';
import { object } from '../../domain/validation.js';
import { ManagementHttp, pageQuery } from './management-http.js';
import {
  PublicationDto,
  PublicProfileDto,
  ReviewDto,
  ReviewAccessDto,
  ReviewSummaryDto,
  PublicationRequestDto,
  PublicationDecisionDto,
  EmptyPublicationDto,
} from './dto/publication.dto.js';
const versionHeaders = () =>
  ApiHeader({ name: 'If-Match', required: true, schema: { type: 'string', example: '"1"' } });
const keyHeaders = () =>
  ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', maxLength: 64 } });
@ManagementApi()
@Controller('')
export class PublicationController {
  constructor(
    private readonly service: PublicationService,
    private readonly http: ManagementHttp,
  ) {}
  @Get('businesses/:businessId/publication')
  @ApiResponse({ status: 200, schema: resultSchema(PublicationDto) })
  async status(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.get(requireCurrentUser(r).id, this.http.business(r)),
    );
  }
  @Get('businesses/:businessId/preview')
  @ApiResponse({ status: 200, schema: resultSchema(PublicProfileDto) })
  async preview(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.preview(requireCurrentUser(r).id, this.http.business(r)),
    );
  }
  @Post('businesses/:businessId/publication/requests')
  @ApiOperation({
    summary:
      'Publish a complete salon immediately with owner consent; also completes legacy pending requests',
  })
  @HttpCode(200)
  @versionHeaders()
  @keyHeaders()
  @ApiBody({ type: PublicationRequestDto })
  @ApiResponse({ status: 200, schema: resultSchema(PublicationDto) })
  async submit(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() v: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.request(await this.http.command(r, 'publication.request', true), v),
    );
  }
  @Post('businesses/:businessId/publication/withdrawals')
  @HttpCode(200)
  @versionHeaders()
  @keyHeaders()
  @ApiBody({ type: EmptyPublicationDto })
  @ApiResponse({ status: 200, schema: resultSchema(PublicationDto) })
  async withdraw(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() v: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.withdraw(await this.http.command(r, 'publication.withdraw', true), v),
    );
  }
  @Get('review/access')
  @ApiResponse({ status: 200, schema: resultSchema(ReviewAccessDto) })
  async access(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(r, s, await this.service.access(requireCurrentUser(r).id));
  }
  @Get('review/businesses')
  @ApiResponse({ status: 200, schema: resultSchema(ReviewSummaryDto, true) })
  async queue(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    return this.http.response(
      r,
      s,
      await this.service.queue(
        requireCurrentUser(r).id,
        pageQuery(object(r.query, ['limit', 'cursor'])),
      ),
    );
  }
  @Get('review/businesses/:businessId')
  @ApiResponse({ status: 200, schema: resultSchema(ReviewDto) })
  async review(@Req() r: AuthenticatedRequest, @Res({ passthrough: true }) s: Response) {
    const data = await this.service.review(requireCurrentUser(r).id, this.http.business(r));
    s.setHeader('ETag', `"${data.publication.version}"`);
    return this.http.response(r, s, data);
  }
  @Post('review/businesses/:businessId/decisions')
  @HttpCode(200)
  @versionHeaders()
  @keyHeaders()
  @ApiBody({ type: PublicationDecisionDto })
  @ApiResponse({ status: 200, schema: resultSchema(PublicationDto) })
  async decide(
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() v: unknown,
  ) {
    return this.http.response(
      r,
      s,
      await this.service.decide(await this.http.command(r, 'publication.decision', true), v),
    );
  }
}
