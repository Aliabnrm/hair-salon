import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
      const version = await pool.query<{ server_version: string }>('SHOW server_version');
      expect(version.rows[0]?.server_version).toMatch(/^17\.11(?:\D|$)/);
      const before = await pool.query(
        "SELECT nspname FROM pg_namespace WHERE nspname IN ('app', 'drizzle')",
      );
      expect(before.rows).toEqual([]);
      expect((await runMigration(target.url)).status).toBe(0);
      const namespaces = await pool.query(
        "SELECT nspname FROM pg_namespace WHERE nspname IN ('app', 'drizzle') ORDER BY nspname",
      );
      expect(namespaces.rows).toEqual([{ nspname: 'app' }, { nspname: 'drizzle' }]);
      const extensions = await pool.query(
        "SELECT extname FROM pg_extension WHERE extname = 'btree_gist'",
      );
      expect(extensions.rows).toEqual([{ extname: 'btree_gist' }]);
      const tables = await pool.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'app' ORDER BY tablename",
      );
      expect(tables.rows).toEqual(
        [
          'appointments',
          'auth_attempt_buckets',
          'booking_events',
          'booking_writes',
          'business_hours',
          'business_memberships',
          'businesses',
          'exception_intervals',
          'management_audit',
          'management_writes',
          'password_credentials',
          'publication_events',
          'reviewer_permission_history',
          'reviewer_permissions',
          'schedule_allocations',
          'schedule_blocks',
          'schedule_exceptions',
          'service_categories',
          'services',
          'sessions',
          'staff_hours',
          'staff_profiles',
          'staff_services',
          'users',
        ].map((tablename) => ({ tablename })),
      );
      const first = await pool.query(
        'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id',
      );
      expect(first.rows).toHaveLength(8);
      const sql = await readFile(
        new URL('../drizzle/0000_database_foundation.sql', import.meta.url),
        'utf8',
      );
      expect(first.rows[0].hash).toBe(createHash('sha256').update(sql).digest('hex'));
      const identitySql = await readFile(
        new URL('../drizzle/0001_identity.sql', import.meta.url),
        'utf8',
      );
      expect(first.rows[1].hash).toBe(createHash('sha256').update(identitySql).digest('hex'));
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
        fileURLToPath(new URL('fixtures/sprint-02-migrations/_journal.json', import.meta.url)),
        join(folder, 'meta/_journal.json'),
      );
      await copyFile(
        fileURLToPath(new URL('../drizzle/0000_database_foundation.sql', import.meta.url)),
        join(folder, '0000_database_foundation.sql'),
      );
      await migrate(drizzle(pool), { migrationsFolder: folder });
      const oldJournal = (
        await pool.query('SELECT id, hash, created_at FROM drizzle.__drizzle_migrations')
      ).rows;
      expect(oldJournal).toHaveLength(1);
      expect(
        (await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='app'")).rows,
      ).toHaveLength(0);
      expect((await runMigration(target.url)).status).toBe(0);
      const upgraded = (
        await pool.query(
          'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id',
        )
      ).rows;
      expect(upgraded).toHaveLength(8);
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

  it('upgrades seeded Sprint 3 identities and sessions without rewriting their history', async () => {
    const target = await createTestDatabase();
    const folder = await mkdtemp(join(tmpdir(), 'hair-salon-s3-upgrade-'));
    const pool = new Pool({ connectionString: target.url });
    try {
      await mkdir(join(folder, 'meta'));
      // Freeze the exact two pre-Sprint-4 journal entries, rather than migrating latest first.
      await writeFile(
        join(folder, 'meta/_journal.json'),
        JSON.stringify({
          version: '7',
          dialect: 'postgresql',
          entries: [
            {
              idx: 0,
              version: '7',
              when: 1793263701610,
              tag: '0000_database_foundation',
              breakpoints: true,
            },
            {
              idx: 1,
              version: '7',
              when: 1793270296975,
              tag: '0001_identity',
              breakpoints: true,
            },
          ],
        }),
      );
      for (const name of ['0000_database_foundation.sql', '0001_identity.sql'])
        await copyFile(
          fileURLToPath(new URL('../drizzle/' + name, import.meta.url)),
          join(folder, name),
        );
      await migrate(drizzle(pool), { migrationsFolder: folder });
      const user = await pool.query<{ id: string }>(
        "INSERT INTO app.users(email) VALUES('upgrade-test@example.com') RETURNING id",
      );
      const id = user.rows[0]?.id;
      await pool.query(
        "INSERT INTO app.password_credentials(user_id,password_hash) VALUES($1,'test-only-preserved-hash')",
        [id],
      );
      await pool.query(
        "INSERT INTO app.sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
        [id, 'a'.repeat(64)],
      );
      const before = (
        await pool.query('SELECT id,hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id')
      ).rows;
      expect((await runMigration(target.url)).status).toBe(0);
      expect(
        (await pool.query('SELECT email,email_verified_at FROM app.users WHERE id=$1', [id])).rows,
      ).toEqual([{ email: 'upgrade-test@example.com', email_verified_at: null }]);
      expect(
        (
          await pool.query('SELECT password_hash FROM app.password_credentials WHERE user_id=$1', [
            id,
          ])
        ).rows[0]?.password_hash,
      ).toBe('test-only-preserved-hash');
      expect(
        (await pool.query('SELECT token_hash,revoked_at FROM app.sessions WHERE user_id=$1', [id]))
          .rows,
      ).toEqual([{ token_hash: 'a'.repeat(64), revoked_at: null }]);
      const after = (
        await pool.query('SELECT id,hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id')
      ).rows;
      expect(after.slice(0, 2)).toEqual(before);
      expect(after).toHaveLength(8);
      expect((await runMigration(target.url)).status).toBe(0);
      expect(
        (
          await pool.query(
            'SELECT id,hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id',
          )
        ).rows,
      ).toEqual(after);
    } finally {
      await pool.end();
      await target.close();
      await rm(folder, { recursive: true, force: true });
    }
  });

  it('removes populated MFA data while preserving existing users, sessions and salon ownership', async () => {
    const target = await createTestDatabase();
    const folder = await mkdtemp(join(tmpdir(), 'hair-salon-remove-mfa-'));
    const pool = new Pool({ connectionString: target.url });
    try {
      await mkdir(join(folder, 'meta'));
      const journal = JSON.parse(
        await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
      );
      journal.entries = journal.entries.slice(0, 3);
      await writeFile(join(folder, 'meta/_journal.json'), JSON.stringify(journal));
      for (const name of ['0000_database_foundation', '0001_identity', '0002_salon_management']) {
        await copyFile(
          fileURLToPath(new URL(`../drizzle/${name}.sql`, import.meta.url)),
          join(folder, `${name}.sql`),
        );
      }
      await migrate(drizzle(pool), { migrationsFolder: folder });
      const user = await pool.query<{ id: string }>(
        "INSERT INTO app.users(email) VALUES('mfa-removal@example.com') RETURNING id",
      );
      const userId = user.rows[0]?.id;
      const session = await pool.query<{ id: string }>(
        "INSERT INTO app.sessions(user_id,token_hash,expires_at,mfa_verified_at,mfa_last_active_at) VALUES($1,$2,now()+interval '1 day',now(),now()) RETURNING id",
        [userId, 'b'.repeat(64)],
      );
      const sessionId = session.rows[0]?.id;
      await pool.query("INSERT INTO app.mfa_factors VALUES($1,'test-only-cipher',1)", [userId]);
      await pool.query(
        "INSERT INTO app.mfa_enrollments(user_id,session_id,cipher,expires_at) VALUES($1,$2,'test-only-cipher',now()+interval '10 minutes')",
        [userId, sessionId],
      );
      await pool.query(
        "INSERT INTO app.reauthentication_grants(hash,user_id,session_id,expires_at) VALUES('test-only-grant',$1,$2,now()+interval '5 minutes')",
        [userId, sessionId],
      );
      await pool.query(
        "INSERT INTO app.mfa_recovery_codes(hash,user_id) VALUES('test-only-recovery',$1)",
        [userId],
      );
      const business = await pool.query<{ id: string }>(
        "INSERT INTO app.businesses(name,audience,city) VALUES('سالن حفظ‌شده','women','تهران') RETURNING id",
      );
      const businessId = business.rows[0]?.id;
      await pool.query('INSERT INTO app.business_memberships(business_id,user_id) VALUES($1,$2)', [
        businessId,
        userId,
      ]);
      const before = (await pool.query('SELECT * FROM app.sessions')).rows;
      const oldHistory = (
        await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')
      ).rows;
      expect((await runMigration(target.url)).status).toBe(0);
      const after = (await pool.query('SELECT * FROM app.sessions')).rows;
      const { mfa_verified_at, mfa_last_active_at, ...preservedSession } = before[0];
      expect(mfa_verified_at).not.toBeNull();
      expect(mfa_last_active_at).not.toBeNull();
      expect(after).toEqual([preservedSession]);
      expect((await pool.query('SELECT email FROM app.users WHERE id=$1', [userId])).rows).toEqual([
        { email: 'mfa-removal@example.com' },
      ]);
      expect(
        (await pool.query('SELECT business_id,user_id,active FROM app.business_memberships')).rows,
      ).toEqual([{ business_id: businessId, user_id: userId, active: true }]);
      expect(
        (
          await pool.query(
            "SELECT tablename FROM pg_tables WHERE schemaname='app' AND (tablename LIKE 'mfa_%' OR tablename='reauthentication_grants')",
          )
        ).rows,
      ).toEqual([]);
      expect(
        (await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows.slice(
          0,
          3,
        ),
      ).toEqual(oldHistory);
      expect((await runMigration(target.url)).status).toBe(0);
    } finally {
      await pool.end();
      await target.close();
      await rm(folder, { recursive: true, force: true });
    }
  });

  it('upgrades a populated Sprint 4 salon without publishing, guessing categories or losing constraints', async () => {
    const target = await createTestDatabase();
    const folder = await mkdtemp(join(tmpdir(), 'hair-salon-s4-upgrade-'));
    const pool = new Pool({ connectionString: target.url });
    try {
      await mkdir(join(folder, 'meta'));
      const journal = JSON.parse(
        await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
      );
      journal.entries = journal.entries.slice(0, 4);
      await writeFile(join(folder, 'meta/_journal.json'), JSON.stringify(journal));
      for (const name of [
        '0000_database_foundation',
        '0001_identity',
        '0002_salon_management',
        '0003_remove_mfa',
      ])
        await copyFile(
          fileURLToPath(new URL('../drizzle/' + name + '.sql', import.meta.url)),
          join(folder, name + '.sql'),
        );
      await migrate(drizzle(pool), { migrationsFolder: folder });
      const user = (
        await pool.query(
          "INSERT INTO app.users(email) VALUES('legacy-s4@example.com') RETURNING id",
        )
      ).rows[0].id;
      const business = (
        await pool.query(
          "INSERT INTO app.businesses(name,audience,city) VALUES('سالن قدیمی','men','تهران') RETURNING id",
        )
      ).rows[0].id;
      await pool.query('INSERT INTO app.business_memberships(business_id,user_id) VALUES($1,$2)', [
        business,
        user,
      ]);
      const service = (
        await pool.query(
          "INSERT INTO app.services(business_id,name,price_irr,duration_minutes,buffer_before_minutes,buffer_after_minutes) VALUES($1,'خدمت قدیمی',0,30,0,0) RETURNING id",
          [business],
        )
      ).rows[0].id;
      const staff = (
        await pool.query(
          "INSERT INTO app.staff_profiles(business_id,display_name) VALUES($1,'متخصص قدیمی') RETURNING id",
          [business],
        )
      ).rows[0].id;
      await pool.query(
        'INSERT INTO app.staff_services(business_id,staff_id,service_id) VALUES($1,$2,$3)',
        [business, staff, service],
      );
      await pool.query(
        'INSERT INTO app.business_hours(business_id,weekday,start_minute,end_minute) VALUES($1,0,540,1080)',
        [business],
      );
      const constraints = (
        await pool.query(
          "SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='app'::regnamespace AND conname<>'business_state' ORDER BY conname",
        )
      ).rows;
      const before = (await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id'))
        .rows;
      expect((await runMigration(target.url)).status).toBe(0);
      expect(
        (
          await pool.query(
            'SELECT state,content_revision,publication_version,current_request_id FROM app.businesses WHERE id=$1',
            [business],
          )
        ).rows[0],
      ).toEqual({
        state: 'draft',
        content_revision: 1,
        publication_version: 1,
        current_request_id: null,
      });
      expect(
        (await pool.query('SELECT category_id,price_irr FROM app.services WHERE id=$1', [service]))
          .rows[0],
      ).toEqual({ category_id: null, price_irr: '0' });
      expect(
        (await pool.query('SELECT public_visible FROM app.staff_profiles WHERE id=$1', [staff]))
          .rows[0].public_visible,
      ).toBe(false);
      expect((await pool.query('SELECT * FROM app.staff_services')).rows).toHaveLength(1);
      expect((await pool.query('SELECT * FROM app.business_hours')).rows).toHaveLength(1);
      const after = (
        await pool.query(
          "SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='app'::regnamespace ORDER BY conname",
        )
      ).rows;
      for (const constraint of constraints) expect(after).toContainEqual(constraint);
      expect(
        (await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows.slice(
          0,
          4,
        ),
      ).toEqual(before);
      expect((await runMigration(target.url)).status).toBe(0);
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
