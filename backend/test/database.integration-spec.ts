import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { runMigration } from './helpers/run-migration.js';
import { createTestDatabase } from './helpers/test-database.js';

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
        "SELECT tablename FROM pg_tables WHERE schemaname = 'app' ORDER BY tablename",
      );
      expect(tables.rows).toEqual(
        [
          'auth_attempt_buckets',
          'password_credentials',
          'sessions',
          'users',
        ].map((tablename) => ({ tablename })),
      );
      const first = await pool.query(
        'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id',
      );
      expect(first.rows).toHaveLength(2);
      const sql = await readFile(
        new URL('../drizzle/0000_database_foundation.sql', import.meta.url),
        'utf8',
      );
      expect(first.rows[0].hash).toBe(
        createHash('sha256').update(sql).digest('hex'),
      );
      const identitySql = await readFile(
        new URL('../drizzle/0001_identity.sql', import.meta.url),
        'utf8',
      );
      expect(first.rows[1].hash).toBe(
        createHash('sha256').update(identitySql).digest('hex'),
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

  it('upgrades a database with the exact Sprint 2 journal without rewriting applied history', async () => {
    const target = await createTestDatabase();
    const folder = await mkdtemp(join(tmpdir(), 'hair-salon-upgrade-test-'));
    const pool = new Pool({ connectionString: target.url });
    try {
      await mkdir(join(folder, 'meta'));
      await copyFile(
        fileURLToPath(
          new URL(
            'fixtures/sprint-02-migrations/_journal.json',
            import.meta.url,
          ),
        ),
        join(folder, 'meta/_journal.json'),
      );
      await copyFile(
        fileURLToPath(
          new URL('../drizzle/0000_database_foundation.sql', import.meta.url),
        ),
        join(folder, '0000_database_foundation.sql'),
      );
      await migrate(drizzle(pool), { migrationsFolder: folder });
      const oldJournal = (
        await pool.query(
          'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations',
        )
      ).rows;
      expect(oldJournal).toHaveLength(1);
      expect(
        (
          await pool.query(
            "SELECT tablename FROM pg_tables WHERE schemaname='app'",
          )
        ).rows,
      ).toHaveLength(0);
      expect((await runMigration(target.url)).status).toBe(0);
      const upgraded = (
        await pool.query(
          'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id',
        )
      ).rows;
      expect(upgraded).toHaveLength(2);
      expect(upgraded[0]).toEqual(oldJournal[0]);
      expect((await runMigration(target.url)).status).toBe(0);
      expect(
        (
          await pool.query(
            'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id',
          )
        ).rows,
      ).toEqual(upgraded);
    } finally {
      await pool.end();
      await target.close();
      await rm(folder, { recursive: true, force: true });
    }
  });

  it('fails cleanly without echoing invalid or unreachable migration targets', async () => {
    for (const url of [
      undefined,
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
