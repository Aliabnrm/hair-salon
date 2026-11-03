import {
  Catch,
  ConsoleLogger,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { CapabilityError } from '../domain/capability-error.js';
import { createApiError } from './api-error.js';
import type { RequestContext } from './request-context.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter<unknown> {
  constructor(private readonly logger: ConsoleLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestContext>();
    const response = http.getResponse<Response>();
    if (exception instanceof CapabilityError) {
      if (exception.retryAfter) response.setHeader('Retry-After', String(exception.retryAfter));
      response.status(exception.status).json({
        error: {
          code: exception.code,
          message: exception.message,
          request_id: request.requestId,
          retryable: exception.status === 503,
          ...(exception.fields ? { fields: exception.fields } : {}),
        },
      });
      return;
    }
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception instanceof Error &&
            'code' in exception &&
            typeof exception.code === 'string' &&
            /^(08|53|57|ECONN|ETIMEDOUT)/.test(exception.code)
          ? 503
          : 500;

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
