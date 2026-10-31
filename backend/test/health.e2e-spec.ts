import {
  request as httpRequest,
  type IncomingMessage,
  type Server,
} from 'node:http';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApplication } from './helpers/create-test-application.js';

const HEALTH = '/api/v1/health/liveness';
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('liveness HTTP contract and request context', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    ({ app } = await createTestApplication());
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => {
    await app?.close();
  });

  it('boots real Nest providers and returns only the public health contract', async () => {
    const response = await request(app.getHttpServer()).get(HEALTH).expect(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.headers['x-request-id']).toMatch(UUID);
    expect(response.body).toEqual({
      data: { status: 'ok' },
      meta: { request_id: response.headers['x-request-id'] },
    });
  });

  it.each(['x', 'client-request_123', 'a'.repeat(64)])(
    'preserves a valid single request id %s',
    async (id) => {
      const response = await request(app.getHttpServer())
        .get(HEALTH)
        .set('X-Request-Id', id)
        .expect(200);
      expect(response.headers['x-request-id']).toBe(id);
      expect(response.body.meta.request_id).toBe(id);
    },
  );

  it.each(['', 'bad id', 'bad,id', 'bad/id', 'a'.repeat(65)])(
    'replaces invalid request id %j',
    async (id) => {
      const response = await request(app.getHttpServer())
        .get(HEALTH)
        .set('X-Request-Id', id)
        .expect(200);
      expect(response.headers['x-request-id']).toMatch(UUID);
      expect(response.body.meta.request_id).toBe(
        response.headers['x-request-id'],
      );
    },
  );

  it('rejects duplicated request-id headers even if each value is valid', async () => {
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string')
      throw new Error('Expected a TCP test server.');
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const outgoing = httpRequest(
        {
          hostname: '127.0.0.1',
          port: address.port,
          path: HEALTH,
          headers: { 'X-Request-Id': ['first', 'second'] },
        },
        (incoming) => {
          incoming.resume();
          incoming.once('end', () => resolve(incoming));
        },
      );
      outgoing.once('error', reject);
      outgoing.end();
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toMatch(UUID);
  });

  it('gives concurrent requests independent contexts', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app.getHttpServer()).get(HEALTH).expect(200),
      ),
    );
    const ids = responses.map((response) => response.headers['x-request-id']);
    expect(new Set(ids).size).toBe(8);
    for (const response of responses)
      expect(response.body.meta.request_id).toBe(
        response.headers['x-request-id'],
      );
  });
});
