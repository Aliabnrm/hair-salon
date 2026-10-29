import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApplication } from './helpers/create-test-application.js';

describe('OpenAPI availability and schema', () => {
  it.each(['development', 'test'] as const)(
    'serves accurate documentation in %s',
    async (environment) => {
      const { app } = await createTestApplication(environment);
      try {
        await request(app.getHttpServer()).get('/api/docs').expect(200);
        const response = await request(app.getHttpServer())
          .get('/api/openapi.json')
          .expect(200);
        expect(Object.keys(response.body.paths)).toEqual([
          '/api/v1/health/readiness',
          '/api/v1/health/liveness',
        ]);
        expect(
          response.body.paths['/api/v1/health/liveness'].get.responses['200']
            .content['application/json'].schema,
        ).toEqual({ $ref: '#/components/schemas/HealthResponseDto' });
        for (const status of ['200', '503']) {
          expect(
            response.body.paths['/api/v1/health/readiness'].get.responses[
              status
            ].content['application/json'].schema,
          ).toEqual({
            $ref:
              status === '200'
                ? '#/components/schemas/HealthResponseDto'
                : '#/components/schemas/ApiErrorDto',
          });
        }
        expect(
          response.body.components.schemas.HealthResponseDto.required,
        ).toEqual(['data', 'meta']);
        expect(
          response.body.components.schemas.HealthDataDto.properties.status.enum,
        ).toEqual(['ok']);
        expect(
          response.body.components.schemas.ApiErrorDetailsDto.required,
        ).toEqual(['code', 'message', 'request_id', 'retryable']);
        expect(
          response.body.paths['/api/v1/health/liveness'].get.responses['500']
            .content['application/json'].schema,
        ).toEqual({ $ref: '#/components/schemas/ApiErrorDto' });
      } finally {
        await app.close();
      }
    },
  );

  it('does not register documentation or fixture endpoints in production', async () => {
    const { app } = await createTestApplication('production');
    try {
      for (const path of [
        '/api/docs',
        '/api/docs/',
        '/api/docs/swagger-ui-init.js',
        '/api/openapi.json',
        '/api/openapi.yaml',
        '/api/v1/_test/failure',
      ]) {
        const response = await request(app.getHttpServer())
          .get(path)
          .expect(404);
        expect(response.body.error.code).toBe('NOT_FOUND');
      }
      await request(app.getHttpServer())
        .get('/api/v1/health/liveness')
        .expect(200);
    } finally {
      await app.close();
    }
  });
});
