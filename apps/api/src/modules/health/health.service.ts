import { Injectable } from '@nestjs/common';
import { DatabaseHealthCheck } from '../../database/database-health.port.js';
import type { HealthDataDto } from './dto/health-response.dto.js';

@Injectable()
export class HealthService {
  constructor(private readonly databaseHealth: DatabaseHealthCheck) {}

  getLiveness(): HealthDataDto {
    return { status: 'ok' };
  }

  async isReady(): Promise<boolean> {
    return this.databaseHealth.isAvailable();
  }
}
