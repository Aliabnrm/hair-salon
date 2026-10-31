import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { ConsoleLogger } from '@nestjs/common';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

function resolveRequestId(request: Request): string {
  // rawHeaders preserves duplicates which Node may join into one value.
  const occurrences = request.rawHeaders.filter(
    (value, index) => index % 2 === 0 && value.toLowerCase() === 'x-request-id',
  ).length;
  const value = request.headers['x-request-id'];

  return occurrences === 1 &&
    typeof value === 'string' &&
    /^[A-Za-z0-9_-]{1,64}$/.test(value)
    ? value
    : randomUUID();
}

export function requestIdMiddleware(
  logger: Pick<ConsoleLogger, 'log'>,
): RequestHandler {
  return (request, response: Response, next: NextFunction) => {
    const context = Object.assign(request, {
      requestId: resolveRequestId(request),
    });
    response.setHeader('X-Request-Id', context.requestId);
    const startedAt = performance.now();

    response.once('finish', () => {
      logger.log({
        event: 'http_request',
        request_id: context.requestId,
        method: request.method,
        status: response.statusCode,
        duration_ms: Math.round(performance.now() - startedAt),
      });
    });
    next();
  };
}
