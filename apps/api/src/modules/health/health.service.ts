import { Injectable } from '@nestjs/common';
import type { HealthDataDto } from './dto/health-response.dto.js';

@Injectable()
export class HealthService {
  getLiveness(): HealthDataDto {
    return { status: 'ok' };
  }
}
