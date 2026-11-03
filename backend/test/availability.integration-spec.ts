import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import request from 'supertest';
import { describe, beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { createTestDatabase } from './helpers/test-database.js';
import { createTestApplication } from './helpers/create-test-application.js';
import { runMigration } from './helpers/run-migration.js';
import { seedAvailability } from './helpers/availability-fixture.js';
import { availabilitySnapshotSql } from '../src/modules/salon-management/infrastructure/persistence/postgres-availability-reader.js';
import { DatabaseProvider } from '../src/database/database.provider.js';

describe('availability through real Nest and PostgreSQL', () => {
  let target: Awaited<ReturnType<typeof createTestDatabase>>,
    pool: Pool,
    fixture: Awaited<ReturnType<typeof createTestApplication>>,
    data: Awaited<ReturnType<typeof seedAvailability>>;
  let now = new Date('2026-11-03T06:00:00Z');
  beforeAll(async () => {
    target = await createTestDatabase();
    expect((await runMigration(target.url)).status).toBe(0);
    expect((await runMigration(target.url)).status).toBe(0);
    pool = new Pool({ connectionString: target.url, max: 5 });
    fixture = await createTestApplication('test', [], target.url, { now: () => now });
  });
  beforeEach(async () => {
    now = new Date('2026-11-03T06:00:00Z');
    await pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
    data = await seedAvailability(pool, '2026-11-03');
  });
  afterAll(async () => {
    await fixture?.app.close();
    await pool?.end();
    await target?.close();
  });
  const get = (q = '', business?: string) =>
    request(fixture.app.getHttpServer()).get(
      `/api/v1/catalog/salons/${business ?? data.business}/availability?service_id=${data.service}${q}`,
    );
  it('returns exact DB buffers, counts only eligible public staff and never writes product data', async () => {
    const before = await pool.query(
      'SELECT content_revision,version,publication_version FROM app.businesses WHERE id=$1',
      [data.business],
    );
    const r = await get().expect(200);
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.body.meta.request_id).toBeTruthy();
    expect(r.body.data).toMatchObject({
      availability_basis: 'schedule_only',
      booking_enabled: false,
      timezone: 'Asia/Tehran',
      checked_at: now.toISOString(),
      from: '2026-11-03',
      to: '2026-11-09',
    });
    expect(r.body.data.days).toHaveLength(7);
    expect(r.body.data.days[0].slots.map((s: { start_local: string }) => s.start_local)).toEqual([
      '10:30',
      '10:45',
      '11:00',
      '11:15',
    ]);
    expect(
      r.body.data.days[0].slots.every(
        (s: { available_staff_count: number }) => s.available_staff_count === 2,
      ),
    ).toBe(true);
    expect(r.body.data.days[1].slots).toEqual([]);
    expect(JSON.stringify(r.body)).not.toMatch(
      /email|buffer_|reason|revision|owner|audit|نام خصوصی|service_ids|membership|session/,
    );
    expect(
      (
        await pool.query(
          'SELECT content_revision,version,publication_version FROM app.businesses WHERE id=$1',
          [data.business],
        )
      ).rows,
    ).toEqual(before.rows);
    expect((await pool.query('SELECT count(*)::int n FROM app.management_audit')).rows[0].n).toBe(
      0,
    );
    const specific = await get(`&staff_id=${data.staff}`).expect(200);
    expect(
      specific.body.data.days[0].slots.every(
        (s: { available_staff_count: number }) => s.available_staff_count === 1,
      ),
    ).toBe(true);
  });
  it('enforces all public query bounds, duplicates, arrays and injection', async () => {
    for (const q of [
      '&service_id=' + data.service,
      '&staff_id=any&staff_id=any',
      '&staff_id[]=any',
      '&unknown=x',
      '&timezone=UTC',
      '&duration_minutes=1',
      '&price_irr=0',
      '&from=2026-11-03',
      '&to=2026-11-04',
      '&from=2026-11-03&to=2026-11-10',
      '&from=2026-11-02&to=2026-11-03',
      '&from=2026-12-03&to=2026-12-03',
      '&from=2026-11-31&to=2026-11-31',
      '&staff_id=bad',
    ]) {
      const r = await get(q).expect(422);
      expect(r.headers['cache-control']).toBe('no-store');
    }
    await get('', 'bad').expect(422);
    await request(fixture.app.getHttpServer())
      .get(`/api/v1/catalog/salons/${data.business}/availability`)
      .expect(422);
  });
  it('conceals unpublished salons, invalid-category services and foreign/private/inactive/unassigned staff', async () => {
    await get(`&staff_id=${data.hidden}`).expect(404);
    await get(`&staff_id=${randomUUID()}`).expect(404);
    const foreign = await seedAvailability(pool, '2026-11-03');
    await get(`&staff_id=${foreign.staff}`).expect(404);
    await get('', foreign.business).expect(404);
    await pool.query('UPDATE app.staff_profiles SET active=false WHERE id=$1', [data.second]);
    expect((await get().expect(200)).body.data.days[0].slots[0].available_staff_count).toBe(1);
    await get(`&staff_id=${data.second}`).expect(404);
    await pool.query('DELETE FROM app.staff_services WHERE staff_id=$1', [data.staff]);
    expect((await get().expect(200)).body.data.days[0].slots).toEqual([]);
    await get(`&staff_id=${data.staff}`).expect(404);
    await pool.query('UPDATE app.services SET active=false WHERE id=$1', [data.service]);
    await get().expect(404);
    await pool.query('UPDATE app.services SET active=true,category_id=NULL WHERE id=$1', [
      data.service,
    ]);
    await get().expect(404);
    await pool.query("UPDATE app.services SET category_id='haircut' WHERE id=$1", [data.service]);
    for (const state of ['draft', 'pending_review', 'suspended']) {
      await pool.query(
        "UPDATE app.businesses SET state=$2,current_request_id=CASE WHEN $2='pending_review' THEN (SELECT id FROM app.publication_events WHERE business_id=$1 AND action='request' LIMIT 1) ELSE NULL END WHERE id=$1",
        [data.business, state],
      );
      await get().expect(404);
    }
  });
  it('reads only live same-tenant overrides; an exception replaces rather than extends a weekly day', async () => {
    const e = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "INSERT INTO app.schedule_exceptions(id,business_id,local_date,closed) VALUES($1,$2,'2026-11-03',false)",
        [e, data.business],
      );
      await client.query(
        'INSERT INTO app.exception_intervals(business_id,exception_id,start_minute,end_minute) VALUES($1,$2,660,720)',
        [data.business, e],
      );
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    expect(
      (await get().expect(200)).body.data.days[0].slots.map(
        (s: { start_local: string }) => s.start_local,
      ),
    ).toEqual(['11:15']);
    await pool.query('UPDATE app.schedule_exceptions SET deleted_at=now() WHERE id=$1', [e]);
    expect((await get().expect(200)).body.data.days[0].slots).toHaveLength(4);
    const foreign = await seedAvailability(pool, '2026-11-03');
    await pool.query(
      "INSERT INTO app.schedule_exceptions(business_id,local_date,closed) VALUES($1,'2026-11-03',true)",
      [foreign.business],
    );
    expect((await get().expect(200)).body.data.days[0].slots).toHaveLength(4);
  });
  it('recomputes the horizon at Tehran midnight and rejects expired links', async () => {
    now = new Date('2026-11-03T20:31:00Z');
    const r = await get().expect(200);
    expect(r.body.data.policy).toMatchObject({
      first_allowed_date: '2026-11-04',
      last_allowed_date: '2026-12-03',
    });
    await get('&from=2026-11-03&to=2026-11-03').expect(422);
    await get('&from=2026-12-03&to=2026-12-03').expect(200);
  });
  it('keeps a statement snapshot during concurrent edits, then observes unpublication after commit', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('LOCK TABLE app.staff_hours IN ACCESS EXCLUSIVE MODE');
      const pending = get().then((r) => r);
      await vi.waitFor(async () =>
        expect(
          (
            await pool.query(
              "SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%WITH eligible AS%'",
            )
          ).rows[0].n,
        ).toBe(1),
      );
      await client.query('UPDATE app.services SET duration_minutes=60 WHERE id=$1', [data.service]);
      await client.query(
        "UPDATE app.businesses SET state='draft',current_request_id=NULL,content_revision=content_revision+1 WHERE id=$1",
        [data.business],
      );
      await client.query('COMMIT');
      const r = await pending;
      // PostgreSQL may acquire this statement's snapshot after relation locks: both outcomes are coherent.
      expect([200, 404]).toContain(r.status);
      if (r.status === 200) {
        expect(r.body.data.service.duration_minutes).toBe(30);
        expect(r.body.data.days[0].slots).toHaveLength(4);
      }
      await get().expect(404);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
  it('returns safe 503 on a real unavailable database, never an empty success', async () => {
    const broken = await createTestApplication(
      'test',
      [],
      'postgresql://unused:unused@127.0.0.1:1/unavailable_test',
    );
    try {
      const r = await request(broken.app.getHttpServer())
        .get(`/api/v1/catalog/salons/${data.business}/availability?service_id=${data.service}`)
        .expect(503);
      expect(r.body.data).toBeUndefined();
      expect(r.headers['cache-control']).toBe('no-store');
      expect(JSON.stringify(r.body)).not.toMatch(/unused|postgres|SELECT|ECONN|stack/);
    } finally {
      await broken.app.close();
    }
  });
  it('retains catalog quota and enforces the dedicated availability quota with Retry-After', async () => {
    const r = await get().expect(200);
    expect(r.body.data.booking_enabled).toBe(false);
    await pool.query(
      "UPDATE app.auth_attempt_buckets SET attempts=60 WHERE operation='public-availability'",
    );
    const limited = await get().expect(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    await pool.query('TRUNCATE app.auth_attempt_buckets');
    await get().expect(200);
    await pool.query(
      "UPDATE app.auth_attempt_buckets SET attempts=180 WHERE operation='public-catalog'",
    );
    await get().expect(429);
  });
  it('bounds real queries and records EXPLAIN evidence for 50 public specialists', async () => {
    await pool.query('UPDATE app.staff_profiles SET public_visible=true WHERE id=$1', [
      data.hidden,
    ]);
    for (let i = 3; i < 50; i++) {
      const id = randomUUID();
      await pool.query(
        "INSERT INTO app.staff_profiles(id,business_id,display_name,public_visible) VALUES($1,$2,'متخصص سنجش',true)",
        [id, data.business],
      );
      await pool.query(
        'INSERT INTO app.staff_services(business_id,staff_id,service_id) VALUES($1,$2,$3)',
        [data.business, id, data.service],
      );
      await pool.query(
        'INSERT INTO app.staff_hours(business_id,staff_id,weekday,start_minute,end_minute) SELECT $1,$2,d,600,720 FROM generate_series(0,6) d',
        [data.business, id],
      );
    }
    const spy = vi.spyOn(fixture.app.get(DatabaseProvider).pool, 'query');
    try {
      const start = performance.now(),
        r = await get().expect(200),
        elapsed = performance.now() - start;
      expect(r.body.data.days[0].slots[0].available_staff_count).toBe(50);
      expect(spy.mock.calls.filter((call) => call[0] === availabilitySnapshotSql)).toHaveLength(1);
      expect(spy.mock.calls).toHaveLength(5); // 2 bounded limiter calls each, 1 snapshot.
      const plan = await pool.query(
        'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + availabilitySnapshotSql,
        [data.business, data.service, null, '2026-11-03', '2026-11-09'],
      );
      await mkdir('../work', { recursive: true });
      await writeFile(
        '../work/sprint-06-query-evidence.json',
        JSON.stringify(
          {
            staff: 50,
            days: 7,
            productStatements: 1,
            totalStatements: 5,
            responseBytes: Buffer.byteLength(JSON.stringify(r.body)),
            requestElapsedMs: elapsed,
            explain: plan.rows,
          },
          null,
          2,
        ),
      );
    } finally {
      spy.mockRestore();
    }
  });
});
