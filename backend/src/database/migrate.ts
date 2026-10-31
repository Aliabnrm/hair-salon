import { config as loadEnvironmentFile } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { validateDatabaseUrl } from '../config/environment.js';

if (process.env.NODE_ENV !== 'test') {
  loadEnvironmentFile({
    path: fileURLToPath(new URL('../../.env', import.meta.url)),
    quiet: true,
  });
}

let pool: Pool | undefined;
try {
  pool = new Pool({
    connectionString: validateDatabaseUrl(process.env.DATABASE_URL),
    max: 1,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 30_000,
    query_timeout: 31_000,
  });
  pool.on('error', () =>
    process.stderr.write('Migration connection failed.\n'),
  );
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
  });
  process.stdout.write('Database migrations applied.\n');
} catch {
  process.stderr.write(
    'Database migration failed. Check DATABASE_URL and local setup.\n',
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}
