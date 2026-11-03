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
it('documents exact publication preconditions, public allowlists and independent review security', async () => {
  const r = await request(fixture.app.getHttpServer()).get('/api/openapi.json').expect(200);
  for (const path of [
    '/api/v1/businesses/{businessId}/publication/requests',
    '/api/v1/businesses/{businessId}/publication/withdrawals',
    '/api/v1/review/businesses/{businessId}/decisions',
  ]) {
    const post = r.body.paths[path].post;
    expect(post.security).toEqual([{ session: [] }]);
    expect(post.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'If-Match', required: true }),
        expect.objectContaining({ name: 'Idempotency-Key', required: true }),
      ]),
    );
    expect(post.responses['428']).toBeDefined();
  }
  const publicSchema = r.body.components.schemas.PublicProfileDto;
  expect(r.body.components.schemas.PublicationDecisionDto.required).toContain('content_revision');
  expect(publicSchema.properties).not.toHaveProperty('email');
  expect(publicSchema.properties).not.toHaveProperty('state');
  expect(publicSchema.properties).not.toHaveProperty('history');
  expect(r.body.components.schemas.PublicationDto.properties.state.enum).toEqual([
    'draft',
    'pending_review',
    'published',
    'suspended',
  ]);
  expect(r.body.paths['/api/v1/catalog/salons'].get.security ?? []).toEqual([]);
  expect(r.body.paths['/api/v1/businesses/{businessId}/publication'].patch).toBeUndefined();
});
it('requires sessions for private publication/review and validates public queries before I/O', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  for (const path of [
    `/businesses/${id}/publication`,
    `/businesses/${id}/preview`,
    '/review/access',
    '/review/businesses',
    `/review/businesses/${id}`,
  ]) {
    const r = await request(fixture.app.getHttpServer())
      .get('/api/v1' + path)
      .expect(401);
    expect(r.headers['cache-control']).toBe('no-store');
  }
  for (const q of ['q=a&q=b', 'district=یاس', 'limit=51', 'other=x']) {
    const r = await request(fixture.app.getHttpServer())
      .get('/api/v1/catalog/salons?' + q)
      .expect(422);
    expect(r.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(r.body)).not.toMatch(/SELECT|postgres|unused/);
  }
});
