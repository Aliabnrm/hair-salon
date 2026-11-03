import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { Pool } from 'pg';
import { validateDatabaseUrl } from '../../src/config/environment.js';

export function validateTestDatabaseUrl(input: unknown): string {
  const value = validateDatabaseUrl(input, 'TEST_DATABASE_URL');
  const url = new URL(value);
  const name = decodeURIComponent(url.pathname.slice(1));
  // URL parameters could override host/database in node-postgres; disallow them.
  if (
    !['127.0.0.1', 'localhost', '[::1]', 'postgres'].includes(url.hostname) ||
    !(/^[a-z][a-z0-9_]*_test$/.test(name) || /^hair_salon_test_[a-z0-9_]+$/.test(name)) ||
    url.search
  ) {
    throw new Error(
      'TEST_DATABASE_URL must target an allowed local test database without URL parameters.',
    );
  }
  return value;
}

export async function createTestDatabase() {
  const base = validateTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const name = `hair_salon_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({
    connectionString: base,
    max: 1,
    connectionTimeoutMillis: 2_000,
    query_timeout: 5_000,
  });
  let created = false;
  try {
    await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);
    created = true;
    const url = new URL(base);
    url.pathname = `/${name}`;
    return {
      url: url.toString(),
      name,
      admin,
      async close() {
        try {
          if (created) {
            // Pool.end() can finish before PostgreSQL observes the socket closing.
            // Wait for orderly disconnects instead of interrupting clients with FORCE.
            const deadline = performance.now() + 5_000;
            while (true) {
              const sessions = await admin.query<{ count: number }>(
                'SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=$1',
                [name],
              );
              if (sessions.rows[0]?.count === 0) break;
              if (performance.now() >= deadline) {
                throw new Error('Test database cleanup timed out waiting for clients to close.');
              }
              await setTimeout(25);
            }
            // Identifier is generated here, never supplied by a caller.
            await admin.query(`DROP DATABASE "${name}"`);
            created = false;
          }
        } finally {
          await admin.end();
        }
      },
    };
  } catch (error) {
    await admin.end();
    throw error;
  }
}
