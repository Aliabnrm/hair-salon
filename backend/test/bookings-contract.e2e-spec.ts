import request from 'supertest';
import { it, expect } from 'vitest';
import { createTestApplication } from './helpers/create-test-application.js';
it('documents protected booking contracts, frozen snapshots, headers and contact privacy', async () => {
  const { app } = await createTestApplication();
  try {
    const { body } = await request(app.getHttpServer()).get('/api/openapi.json').expect(200);
    const create = body.paths['/api/v1/appointments'].post;
    expect(create.security).toEqual([{ session: [] }]);
    expect(create.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Idempotency-Key', required: true }),
      ]),
    );
    const input = create.requestBody.content['application/json'].schema;
    expect(input.additionalProperties).toBe(false);
    expect(input.required).toContain('customer_mobile');
    expect(input.properties.booking_user_id).toBeUndefined();
    expect(
      create.responses['201'].content['application/json'].schema.properties.data.properties.snapshot
        .properties.price_irr.type,
    ).toBe('integer');
    const manual =
      body.paths['/api/v1/businesses/{businessId}/appointments'].post.requestBody.content[
        'application/json'
      ].schema;
    expect(manual.required).not.toContain('customer_mobile');
    expect(manual.properties.notice_override_reason).toBeDefined();
    const cancel =
      body.paths['/api/v1/businesses/{businessId}/appointments/{id}/cancellation'].post;
    expect(cancel.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'If-Match', required: true })]),
    );
    for (const route of [
      '/api/v1/appointments/3e70e632-9975-4371-9022-9bfbc5c698c5',
      '/api/v1/me/appointments',
      '/api/v1/me/booking-intents/example?operation=online',
      '/api/v1/businesses/3e70e632-9975-4371-9022-9bfbc5c698c5/appointments?date=2026-11-03',
    ])
      await request(app.getHttpServer()).get(route).expect(401);
  } finally {
    await app.close();
  }
});
