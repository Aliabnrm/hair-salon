import request from 'supertest';
import { it, expect } from 'vitest';
import { createTestApplication } from './helpers/create-test-application.js';
it('documents public schedule semantics, dates, privacy, no-store and failure statuses', async () => {
  const { app } = await createTestApplication();
  try {
    const { body } = await request(app.getHttpServer()).get('/api/openapi.json').expect(200);
    const operation = body.paths['/api/v1/catalog/salons/{businessId}/availability'].get;
    expect(operation.security ?? []).toEqual([]);
    expect(operation.parameters.map((p: { name: string }) => p.name).sort()).toEqual([
      'businessId',
      'from',
      'service_id',
      'staff_id',
      'to',
    ]);
    for (const status of [200, 404, 422, 429, 503])
      expect(operation.responses[status]).toBeDefined();
    expect(operation.responses[200].headers['Cache-Control'].schema.enum).toEqual(['no-store']);
    expect(operation.responses[429].headers['Retry-After']).toBeDefined();
    const schema = body.components.schemas.AvailabilityDto;
    expect(schema.properties.availability_basis.enum).toEqual(['schedule_only']);
    expect(schema.properties.booking_enabled.enum).toEqual([false]);
    expect(
      body.components.schemas.AvailabilitySlotDto.properties.available_staff_count.maximum,
    ).toBe(50);
    expect(schema.properties.days.maxItems).toBe(7);
    expect(JSON.stringify(schema)).not.toMatch(/email|buffer_before|reason|revision/);
  } finally {
    await app.close();
  }
});
