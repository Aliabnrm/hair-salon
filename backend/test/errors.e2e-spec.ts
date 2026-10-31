import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  FailureController,
  SENSITIVE_SENTINEL,
} from './fixtures/failure.controller.js';
import { createTestApplication } from './helpers/create-test-application.js';

describe('safe HTTP errors and logs', () => {
  let app: INestApplication;
  let entries: unknown[];

  beforeAll(async () => {
    const result = await createTestApplication('test', [FailureController]);
    app = result.app;
    entries = result.logger.entries;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('normalizes a framework 404 and never logs request secrets', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/missing?secret=${SENSITIVE_SENTINEL}`)
      .set('Authorization', `Bearer ${SENSITIVE_SENTINEL}`)
      .set('Cookie', `session=${SENSITIVE_SENTINEL}`)
      .set('X-Request-Id', 'known-404')
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'مسیر موردنظر یافت نشد.',
        request_id: 'known-404',
        retryable: false,
      },
    });
    expect(response.headers['x-request-id']).toBe('known-404');
    expect(entries).toContainEqual(
      expect.objectContaining({
        event: 'http_request',
        request_id: 'known-404',
        method: 'GET',
        status: 404,
        duration_ms: expect.any(Number),
      }),
    );
    expect(JSON.stringify(entries)).not.toContain(SENSITIVE_SENTINEL);
  });

  it('replaces an invalid request id for unknown routes too', async () => {
    const response = await request(app.getHttpServer())
      .get('/missing')
      .set('X-Request-Id', 'bad/id')
      .expect(404);
    expect(response.headers['x-request-id']).not.toBe('bad/id');
    expect(response.body.error.request_id).toBe(
      response.headers['x-request-id'],
    );
  });

  it('normalizes an unknown exception without exposing its text or stack', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/_test/failure')
      .expect(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'خطایی در پردازش درخواست رخ داد.',
        request_id: response.headers['x-request-id'],
        retryable: false,
      },
    });
    expect(entries).toContainEqual(
      expect.objectContaining({
        event: 'http_error',
        request_id: response.headers['x-request-id'],
        status: 500,
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain(SENSITIVE_SENTINEL);
    expect(JSON.stringify(entries)).not.toContain(SENSITIVE_SENTINEL);
  });
});
