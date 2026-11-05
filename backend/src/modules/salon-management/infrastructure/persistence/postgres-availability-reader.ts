import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { AvailabilityReader } from '../../application/ports/availability-reader.js';
import type { AvailabilityQuery } from '../../domain/availability/availability.types.js';
import { readSchedule } from './schedule-inventory.js';
export { availabilitySnapshotSql } from './schedule-inventory.js';
@Injectable()
export class PostgresAvailabilityReader extends AvailabilityReader {
  constructor(private readonly database: DatabaseProvider) {
    super();
  }
  read(business: string, query: AvailabilityQuery) {
    return readSchedule(this.database.pool, business, query);
  }
}
