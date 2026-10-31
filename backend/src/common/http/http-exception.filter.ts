import {
  Catch,
  ConsoleLogger,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { createApiError } from './api-error.js';
import type { RequestContext } from './request-context.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter<unknown> {
  constructor(private readonly logger: ConsoleLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestContext>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    if (status >= 500) {
      this.logger.error({
        event: 'http_error',
        request_id: request.requestId,
        status,
        code: createApiError(status, request.requestId).error.code,
      });
    }

    response.status(status).json(createApiError(status, request.requestId));
  }
}
