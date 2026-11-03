import request from 'supertest';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { createTestApplication } from './helpers/create-test-application.js';
let fixture: Awaited<ReturnType<typeof createTestApplication>>;
beforeAll(async () => {
  fixture = await createTestApplication();
});
afterAll(async () => {
  await fixture?.app.close();
});
it('exposes real management schemas with write preconditions and bounded amounts', async () => {
  const result = await request(fixture.app.getHttpServer()).get('/api/openapi.json').expect(200);
  const paths = result.body.paths;
  expect(paths['/api/v1/businesses'].post.responses['201']).toBeDefined();
  const patch = paths['/api/v1/businesses/{businessId}/services/{id}'].patch;
  expect(patch.parameters).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Idempotency-Key',
        required: true,
        in: 'header',
      }),
      expect.objectContaining({
        name: 'If-Match',
        required: true,
        in: 'header',
      }),
    ]),
  );
  expect(patch.responses['428']).toBeDefined();
  expect(patch.security).toEqual([{ session: [] }]);
  expect(result.body.components.schemas.ServiceCreateDto.properties.price_irr).toMatchObject({
    type: 'integer',
    maximum: 10000000000,
    multipleOf: 10,
  });
  expect(Object.keys(paths).some((path) => /mfa|reauthentications/.test(path))).toBe(false);
});
it('requires a primary session and keeps management errors private without database access', async () => {
  for (const path of ['/api/v1/me/businesses']) {
    const result = await request(fixture.app.getHttpServer())
      .get(path)
      .set('X-Request-Id', 's4-anonymous')
      .expect(401);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body.error.request_id).toBe('s4-anonymous');
  }
});

it('removes all former MFA and password reauthentication endpoints', async () => {
  for (const [method, path] of [
    ['get', '/api/v1/me/mfa'],
    ['post', '/api/v1/auth/reauthentications'],
    ['post', '/api/v1/me/mfa/enrollments'],
    ['post', '/api/v1/me/mfa/enrollments/00000000-0000-4000-8000-000000000000/confirmations'],
    ['post', '/api/v1/auth/mfa/verifications'],
  ] as const) {
    await request(fixture.app.getHttpServer())[method](path).expect(404);
  }
});

it('returns a private service-unavailable response when session storage is unreachable', async () => {
  const result = await request(fixture.app.getHttpServer())
    .get('/api/v1/me/businesses')
    .set('Cookie', `hair_salon_session=${'x'.repeat(43)}`)
    .expect(503);
  expect(result.body.error.code).toBe('SERVICE_UNAVAILABLE');
  expect(result.headers['cache-control']).toBe('no-store');
  expect(JSON.stringify(result.body)).not.toContain('unused');
});
