import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createTestApplication } from './helpers/create-test-application.js';

const origin = 'http://localhost:3000';
const credentials = {
  email: 'customer@example.com',
  password: 'test-only-safe-password',
};
describe('identity HTTP boundaries without a database', () => {
  let fixture: Awaited<ReturnType<typeof createTestApplication>>;
  beforeAll(async () => {
    fixture = await createTestApplication();
  });
  afterAll(async () => {
    await fixture?.app.close();
  });
  it.each([
    undefined,
    'null',
    'https://foreign.example',
    `${origin}.evil.example`,
  ])(
    'rejects missing/null/foreign Origin before I/O: %s',
    async (untrusted) => {
      for (const route of ['register', 'login', 'logout']) {
        const call = request(fixture.app.getHttpServer())
          .post(`/api/v1/auth/${route}`)
          .send(credentials);
        if (untrusted !== undefined) call.set('Origin', untrusted);
        const response = await call.expect(403);
        expect(response.body.error.code).toBe('FORBIDDEN');
        expect(response.headers['cache-control']).toBe('no-store');
      }
    },
  );
  it('rejects form content and does not turn it into a login', async () => {
    await request(fixture.app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .type('form')
      .send(credentials)
      .expect(415);
  });
  it.each([
    {},
    { ...credentials, user_id: 'forged-actor' },
    { ...credentials, role: 'owner' },
    { ...credentials, email: ['customer@example.com'] },
    { ...credentials, password: 'short' },
    { ...credentials, password: 123456789012 },
    { ...credentials, email: 'invalid-email' },
  ])(
    'rejects invalid DTO or mass assignment without DB access',
    async (body) => {
      const response = await request(fixture.app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Origin', origin)
        .send(body)
        .expect(422);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(JSON.stringify(response.body)).not.toContain('forged-actor');
    },
  );
  it('limits the JSON body before hashing and preserves a safe error envelope', async () => {
    const response = await request(fixture.app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .set('X-Request-Id', 'oversized-input')
      .send({ ...credentials, password: 'sensitive-sentinel'.repeat(2000) })
      .expect(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(response.body.error.request_id).toBe('oversized-input');
    expect(JSON.stringify(response.body)).not.toContain('sensitive-sentinel');
  });
  it('rejects malformed JSON and an unauthenticated current-user request', async () => {
    await request(fixture.app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    const response = await request(fixture.app.getHttpServer())
      .get('/api/v1/me')
      .expect(401);
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('returns a safe 503 for an unavailable auth database while liveness remains alive', async () => {
    const response = await request(fixture.app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send(credentials)
      .expect(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain(credentials.password);
    await request(fixture.app.getHttpServer())
      .get('/api/v1/health/liveness')
      .expect(200);
  });
  it('allows repeated sign-out without a cookie and exposes no session', async () => {
    const response = await request(fixture.app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Origin', origin)
      .send({})
      .expect(200);
    expect(response.body.data).toEqual({ signed_out: true });
    expect(JSON.stringify(fixture.logger.entries)).not.toContain(
      credentials.password,
    );
  });
});
