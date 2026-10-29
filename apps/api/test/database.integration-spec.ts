import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { createTestDatabase } from './helpers/test-database.js';

async function runMigration(url: string) {
  return new Promise<{ status: number | null; output: string }>(
    (resolve, reject) => {
      const child = spawn(process.execPath, ['dist/database/migrate.js'], {
        cwd: fileURLToPath(new URL('../', import.meta.url)),
        env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      const timeout = setTimeout(() => child.kill('SIGKILL'), 10_000);
      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      child.stderr.on('data', (data: Buffer) => {
        output += data.toString();
      });
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('close', (status) => {
        clearTimeout(timeout);
        resolve({ status, output });
      });
    },
  );
}

describe('real PostgreSQL migrations', () => {
  it('migrates an empty owned database, records the SQL hash and safely runs twice', async () => {
    const target = await createTestDatabase();
    const pool = new Pool({ connectionString: target.url });
    try {
      const version = await pool.query<{ server_version: string }>(
        'SHOW server_version',
      );
      expect(version.rows[0]?.server_version).toMatch(/^17\.11(?:\D|$)/);
      const before = await pool.query(
        "SELECT nspname FROM pg_namespace WHERE nspname IN ('app', 'drizzle')",
      );
      expect(before.rows).toEqual([]);
      expect((await runMigration(target.url)).status).toBe(0);
      const namespaces = await pool.query(
        "SELECT nspname FROM pg_namespace WHERE nspname IN ('app', 'drizzle') ORDER BY nspname",
      );
      expect(namespaces.rows).toEqual([
        { nspname: 'app' },
        { nspname: 'drizzle' },
      ]);
      const extensions = await pool.query(
        "SELECT extname FROM pg_extension WHERE extname = 'btree_gist'",
      );
      expect(extensions.rows).toEqual([{ extname: 'btree_gist' }]);
      const tables = await pool.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'app'",
      );
      expect(tables.rows).toEqual([]);
      const first = await pool.query(
        'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id',
      );
      expect(first.rows).toHaveLength(1);
      const sql = await readFile(
        new URL('../drizzle/0000_database_foundation.sql', import.meta.url),
        'utf8',
      );
      expect(first.rows[0].hash).toBe(
        createHash('sha256').update(sql).digest('hex'),
      );
      expect((await runMigration(target.url)).status).toBe(0);
      expect(
        (
          await pool.query(
            'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id',
          )
        ).rows,
      ).toEqual(first.rows);
    } finally {
      await pool.end();
      await target.close();
    }
  });

  it('fails cleanly without echoing invalid or unreachable migration targets', async () => {
    for (const url of [
      'https://migration-sensitive-sentinel@localhost/db',
      'postgresql://migration-sensitive-sentinel:fake@127.0.0.1:1/local_test',
    ]) {
      const result = await runMigration(url);
      expect(result.status).toBe(1);
      expect(result.output).toContain('Database migration failed');
      expect(result.output).not.toContain('migration-sensitive-sentinel');
    }
  });
});
