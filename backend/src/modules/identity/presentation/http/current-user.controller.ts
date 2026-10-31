import { Controller, Get, Req, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorDto } from '../../../../common/http/api-error.js';
import type { RequestContext } from '../../../../common/http/request-context.js';
import type { IdentityUser } from '../../application/ports/identity-store.port.js';
import { CurrentUser } from './current-user.decorator.js';
import {
  currentUserResponse,
  CurrentUserResponseDto,
} from './dto/current-user-response.dto.js';
import { IdentityExceptionFilter } from './identity-exception.filter.js';
import { SessionAuthGuard } from './session-auth.guard.js';
@ApiTags('identity')
@ApiCookieAuth('session')
@Controller('me')
@UseGuards(SessionAuthGuard)
@UseFilters(IdentityExceptionFilter)
export class CurrentUserController {
  @Get()
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 503, type: ApiErrorDto })
  current(
    @CurrentUser() user: IdentityUser,
    @Req() request: RequestContext,
  ): CurrentUserResponseDto {
    return currentUserResponse(user, request.requestId);
  }
}
