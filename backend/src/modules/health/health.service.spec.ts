import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { DatabaseHealthCheck } from '../../database/database-health.port.js';
import { HealthService } from './health.service.js';

describe('HealthService boundary', () => {
  it.each([true, false])(
    'uses the injected probe (%s), with independent liveness',
    async (available) => {
      let calls = 0;
      const module = await Test.createTestingModule({
        providers: [
          HealthService,
          {
            provide: DatabaseHealthCheck,
            useValue: {
              isAvailable: async () => {
                calls++;
                return available;
              },
            },
          },
        ],
      }).compile();
      try {
        const service = module.get(HealthService);
        expect(service.getLiveness()).toEqual({ status: 'ok' });
        expect(calls).toBe(0);
        expect(await service.isReady()).toBe(available);
        expect(calls).toBe(1);
      } finally {
        await module.close();
      }
    },
  );
});
