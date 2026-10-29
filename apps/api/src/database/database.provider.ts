import {
  ConsoleLogger,
  Injectable,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Environment } from '../config/environment.js';
import * as schema from './schema.js';

// Small development budget: at most five sockets; both pool wait and I/O are bounded.
export const DATABASE_LIMITS = {
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 1_000,
  statement_timeout: 1_000,
  query_timeout: 1_200,
} as const;

@Injectable()
export class DatabaseProvider implements OnApplicationShutdown {
  readonly pool: Pool;
  readonly db;

  constructor(config: ConfigService<Environment, true>, logger: ConsoleLogger) {
    this.pool = new Pool({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      ...DATABASE_LIMITS,
    });
    this.pool.on('error', () => {
      logger.error({ event: 'database_idle_error' });
    });
    this.db = drizzle({ client: this.pool, schema });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
