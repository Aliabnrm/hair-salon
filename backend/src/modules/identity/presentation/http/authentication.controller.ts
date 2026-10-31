import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { RequestContext } from '../../../../common/http/request-context.js';
import { ApiErrorDto } from '../../../../common/http/api-error.js';
import type { Environment } from '../../../../config/environment.js';
import { AuthAttemptLimiter } from '../../application/auth-attempt-limiter.service.js';
import { RegisterUserService } from '../../application/register-user.service.js';
import { SignInService } from '../../application/sign-in.service.js';
import { SignOutService } from '../../application/sign-out.service.js';
import { AuthMutationGuard } from './auth-mutation.guard.js';
import { CredentialsPipe } from './credentials.pipe.js';
import { RegisterRequestDto } from './dto/register-request.dto.js';
import { SignInRequestDto } from './dto/sign-in-request.dto.js';
import {
  currentUserResponse,
  CurrentUserResponseDto,
} from './dto/current-user-response.dto.js';
import {
  RegistrationResponseDto,
  SignOutResponseDto,
} from './dto/registration-response.dto.js';
import { IdentityExceptionFilter } from './identity-exception.filter.js';
import {
  authenticationPeer,
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from './session-cookie.js';
@ApiTags('identity')
@ApiResponse({ status: 400, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@ApiResponse({ status: 413, type: ApiErrorDto })
@ApiResponse({ status: 415, type: ApiErrorDto })
@ApiResponse({ status: 422, type: ApiErrorDto })
@ApiResponse({
  status: 429,
  type: ApiErrorDto,
  headers: { 'Retry-After': { schema: { type: 'integer', minimum: 1 } } },
})
@ApiResponse({ status: 503, type: ApiErrorDto })
@Controller('auth')
@UseGuards(AuthMutationGuard)
@UseFilters(IdentityExceptionFilter)
export class AuthenticationController {
  constructor(
    private readonly registerUser: RegisterUserService,
    private readonly signIn: SignInService,
    private readonly signOut: SignOutService,
    private readonly limiter: AuthAttemptLimiter,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  @Post('register')
  @HttpCode(202)
  @ApiBody({ type: RegisterRequestDto })
  @ApiAcceptedResponse({ type: RegistrationResponseDto })
  async register(
    @Body(CredentialsPipe) body: RegisterRequestDto,
    @Req() request: RequestContext,
  ): Promise<RegistrationResponseDto> {
    await this.limiter.check(
      'register',
      authenticationPeer(request),
      body.email,
    );
    await this.registerUser.execute(body.email, body.password);
    return {
      data: { registration: 'received' },
      meta: { request_id: request.requestId },
    };
  }
  @Post('login')
  @HttpCode(200)
  @ApiBody({ type: SignInRequestDto })
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  async login(
    @Body(CredentialsPipe) body: SignInRequestDto,
    @Req() request: RequestContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CurrentUserResponseDto> {
    await this.limiter.check('login', authenticationPeer(request), body.email);
    const environment = this.config.get('NODE_ENV', { infer: true });
    const result = await this.signIn.execute(
      body.email,
      body.password,
      readSessionCookie(request, environment),
    );
    setSessionCookie(response, result.token, environment);
    return currentUserResponse(result.user, request.requestId);
  }
  @Post('logout')
  @HttpCode(200)
  @ApiOkResponse({ type: SignOutResponseDto })
  async logout(
    @Req() request: RequestContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignOutResponseDto> {
    const environment = this.config.get('NODE_ENV', { infer: true });
    await this.signOut.execute(readSessionCookie(request, environment));
    clearSessionCookie(response, environment);
    return {
      data: { signed_out: true },
      meta: { request_id: request.requestId },
    };
  }
}
