import { ConsoleLogger, Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseHealthCheck } from './database-health.port.js';
import { DatabaseProvider, DATABASE_LIMITS } from './database.provider.js';

@Injectable()
export class PostgresHealthCheck extends DatabaseHealthCheck {
  constructor(
    private readonly database: DatabaseProvider,
    private readonly logger: ConsoleLogger,
  ) {
    super();
  }

  async isAvailable(): Promise<boolean> {
    let client: PoolClient | undefined;
    let failed = false;
    try {
      client = await this.database.pool.connect();
      // Set the probe deadline explicitly even if URL parameters change client defaults.
      const query = {
        text: 'SELECT 1',
        query_timeout: DATABASE_LIMITS.query_timeout,
      };
      await client.query(query);
      return true;
    } catch {
      failed = true;
      this.logger.error({
        event: 'database_probe_failed',
        phase: client ? 'query' : 'acquire',
      });
      return false;
    } finally {
      // A timed-out query may still be active server-side. Destroy that socket.
      client?.release(failed);
    }
  }
}
