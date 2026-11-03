import { Pool } from 'pg';
import { expect, it } from 'vitest';
import { createTestDatabase } from './helpers/test-database.js';

it('waits for owned database clients to disconnect without interrupting their queries', async () => {
  const target = await createTestDatabase();
  const pool = new Pool({ connectionString: target.url });
  let closing: Promise<void> | undefined;
  try {
    const client = await pool.connect();
    closing = target.close();
    await Promise.all([
      closing,
      (async () => {
        try {
          // The shared admin pool serializes this behind cleanup's first query.
          await target.admin.query('SELECT 1');
          const result = await client.query<{ answer: number }>('SELECT 42 AS answer');
          expect(result.rows).toEqual([{ answer: 42 }]);
        } finally {
          client.release();
          await pool.end();
        }
      })(),
    ]);
  } finally {
    if (!pool.ending) await pool.end();
    await (closing ?? target.close());
  }

  const probe = new Pool({ connectionString: target.url });
  try {
    await expect(probe.query('SELECT 1')).rejects.toMatchObject({ code: '3D000' });
  } finally {
    await probe.end();
  }
});
