import { ConsoleLogger, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/http/http-exception.filter.js';
import { requestIdMiddleware } from './common/http/request-id.middleware.js';
import { ApiErrorDto, createApiError } from './common/http/api-error.js';
import type { RequestContext } from './common/http/request-context.js';
import type { Response } from 'express';
import type { Environment } from './config/environment.js';

export async function configureApplication(
  app: INestApplication,
): Promise<void> {
  const config = app.get(ConfigService<Environment, true>);
  app.setGlobalPrefix('api/v1');
  app.use(requestIdMiddleware(app.get(ConsoleLogger)));
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const document = () =>
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('Hair Salon API')
          .setVersion('1')
          .build(),
        { extraModels: [ApiErrorDto] },
      );
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: '/api/openapi.json',
      yamlDocumentUrl: '/api/openapi.yaml',
      raw: ['json'],
    });
  }

  await app.init();
  // Nest 12 scopes its default 404 handler to the global prefix. This API owns
  // the whole server, so unmatched root/documentation paths need the same JSON.
  app.use((request: RequestContext, response: Response) => {
    response.status(404).json(createApiError(404, request.requestId));
  });
}
