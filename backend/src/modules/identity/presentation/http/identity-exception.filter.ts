import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { createApiError } from '../../../../common/http/api-error.js';
import type { RequestContext } from '../../../../common/http/request-context.js';
import {
  AuthRateLimitError,
  IdentityUnavailableError,
  InvalidCredentialsError,
} from '../../domain/identity-errors.js';
@Catch(AuthRateLimitError, IdentityUnavailableError, InvalidCredentialsError)
export class IdentityExceptionFilter implements ExceptionFilter<Error> {
  catch(error: Error, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<RequestContext>();
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof AuthRateLimitError
        ? 429
        : error instanceof InvalidCredentialsError
          ? 401
          : 503;
    response.setHeader('Cache-Control', 'no-store');
    if (error instanceof AuthRateLimitError)
      response.setHeader('Retry-After', String(error.retryAfterSeconds));
    response.status(status).json(createApiError(status, request.requestId));
  }
}
