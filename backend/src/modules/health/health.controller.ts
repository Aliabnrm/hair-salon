import {
  Controller,
  Get,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiTags,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/http/api-error.js';
import type { RequestContext } from '../../common/http/request-context.js';
import { HealthResponseDto } from './dto/health-response.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('readiness')
  @ApiOkResponse({
    type: HealthResponseDto,
    description: 'Database accepts a bounded SELECT 1.',
  })
  @ApiServiceUnavailableResponse({ type: ApiErrorDto })
  async getReadiness(
    @Req() request: RequestContext,
  ): Promise<HealthResponseDto> {
    if (!(await this.healthService.isReady()))
      throw new ServiceUnavailableException();
    return { data: { status: 'ok' }, meta: { request_id: request.requestId } };
  }

  @Get('liveness')
  @ApiOkResponse({
    type: HealthResponseDto,
    description: 'Process liveness only.',
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  getLiveness(@Req() request: RequestContext): HealthResponseDto {
    return {
      data: this.healthService.getLiveness(),
      meta: { request_id: request.requestId },
    };
  }
}
