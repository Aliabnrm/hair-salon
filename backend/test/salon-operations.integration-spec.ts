import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase } from './helpers/test-database.js';
import { runMigration } from './helpers/run-migration.js';
import { createTestApplication } from './helpers/create-test-application.js';
import { seedAvailability } from './helpers/availability-fixture.js';
import { BookingStore } from '../src/modules/bookings/application/booking-store.js';
import { BookingChangesStore } from '../src/modules/bookings/application/booking-changes-store.js';
import { SalonOperationsStore } from '../src/modules/bookings/application/salon-operations-store.js';
import type {
  BookingCommand,
  CreateBooking,
} from '../src/modules/bookings/domain/booking.types.js';
import { DatabaseProvider } from '../src/database/database.provider.js';
const initial = new Date('2026-11-03T06:00:00Z');
describe('salon operations with shared real PostgreSQL capacity', () => {
  let target: Awaited<ReturnType<typeof createTestDatabase>>,
    pool: Pool,
    fixture: Awaited<ReturnType<typeof createTestApplication>>,
    data: Awaited<ReturnType<typeof seedAvailability>>,
    store: BookingStore,
    changes: BookingChangesStore,
    ops: SalonOperationsStore,
    actor: string,
    now = initial;
  beforeAll(async () => {
    target = await createTestDatabase();
    const m = await runMigration(target.url);
    expect(m.status, m.output).toBe(0);
    pool = new Pool({ connectionString: target.url });
    fixture = await createTestApplication('test', [], target.url, { now: () => now });
    store = fixture.app.get(BookingStore);
    changes = fixture.app.get(BookingChangesStore);
    ops = fixture.app.get(SalonOperationsStore);
  });
  beforeEach(async () => {
    now = initial;
    await pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
    data = await seedAvailability(pool, '2026-11-03');
    actor = randomUUID();
    await pool.query('INSERT INTO app.users(id,email) VALUES($1,$2)', [
      actor,
      actor + '@example.com',
    ]);
  });
  afterAll(async () => {
    await fixture?.app.close();
    await pool?.end();
    await target?.close();
  });
  function command(
    who: string = data.owner,
    operation: BookingCommand['operation'] = 'outcome',
    key: string = randomUUID(),
  ): BookingCommand {
    return { actor: who, operation, key, fingerprint: key };
  }
  function input(patch: Partial<CreateBooking> = {}): CreateBooking {
    return {
      business_id: data.business,
      service_id: data.service,
      staff_id: data.staff,
      starts_at: '2026-11-03T07:00:00.000Z',
      expected_price_irr: 2500000,
      expected_duration_minutes: 30,
      customer_name: 'مشتری آزمون',
      customer_mobile: '09123456789',
      notice_override_reason: null,
      ...patch,
    };
  }
  function block() {
    return {
      staff_id: data.staff,
      starts_at: '2026-11-03T07:00:00.000Z',
      ends_at: '2026-11-03T07:30:00.000Z',
      reason: 'دلیل خصوصی استراحت',
    };
  }
  async function booking() {
    return store.create(command(actor, 'online'), input(), now);
  }
  async function cookie(who: string) {
    const t = randomBytes(32).toString('base64url');
    await pool.query(
      "INSERT INTO app.sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [who, createHash('sha256').update(t).digest('hex')],
    );
    return 'hair_salon_session=' + t;
  }
  it('records and corrects result with shared history and unchanged agreement/allocation', async () => {
    const a = await booking(),
      before = (await pool.query('SELECT * FROM app.schedule_allocations')).rows;
    now = new Date(a.ends_at);
    const cmd = command();
    const done = await ops.outcome(
      cmd,
      data.business,
      a.id,
      { status: 'completed', reason: null },
      1,
    );
    expect(done).toMatchObject({
      status: 'completed',
      version: 2,
      snapshot: a.snapshot,
      code: a.code,
    });
    expect(
      (await ops.outcome(cmd, data.business, a.id, { status: 'completed', reason: null }, 1))
        .version,
    ).toBe(2);
    await expect(
      ops.outcome(command(), data.business, a.id, { status: 'confirmed', reason: null }, 2),
    ).rejects.toMatchObject({ status: 422 });
    const reset = await ops.outcome(
      command(),
      data.business,
      a.id,
      { status: 'confirmed', reason: 'اصلاح نتیجه اشتباه' },
      2,
    );
    expect(reset.status).toBe('confirmed');
    await ops.outcome(command(), data.business, a.id, { status: 'no_show', reason: null }, 3);
    expect((await pool.query('SELECT * FROM app.schedule_allocations')).rows).toEqual(before);
    const history = await changes.changes(actor, a.id, now);
    expect(history.items[0]).toMatchObject({ action: 'outcome', result_status: 'no_show' });
    expect(history.items[1]).toMatchObject({
      action: 'corrected',
      result_status: 'confirmed',
      reason: 'اصلاح نتیجه اشتباه',
    });
    expect((await store.resolve(data.owner, cmd.key, 'outcome')).status).toBe('no_show');
  });
  it('rejects early completion/no-show and other owners, with no ledger effects', async () => {
    const a = await booking();
    await expect(
      ops.outcome(command(), data.business, a.id, { status: 'completed', reason: null }, 1),
    ).rejects.toMatchObject({ code: 'OUTCOME_TOO_EARLY' });
    await expect(
      ops.outcome(command(), data.business, a.id, { status: 'no_show', reason: null }, 1),
    ).rejects.toMatchObject({ code: 'OUTCOME_TOO_EARLY' });
    now = new Date(a.ends_at);
    await expect(
      ops.outcome(command(actor), data.business, a.id, { status: 'completed', reason: null }, 1),
    ).rejects.toMatchObject({ status: 404 });
    expect((await store.get(actor, a.id)).version).toBe(1);
  });
  it('serializes two result submissions and outcome vs late cancellation', async () => {
    const a = await booking();
    now = new Date(a.ends_at);
    const r = await Promise.allSettled(
      ['completed', 'no_show'].map((status) =>
        ops.outcome(
          command(),
          data.business,
          a.id,
          { status: status === 'completed' ? 'completed' : 'no_show', reason: null },
          1,
        ),
      ),
    );
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect((await store.get(actor, a.id)).version).toBe(2);
    await expect(
      store.cancel(command(data.owner, 'cancel'), data.business, a.id, 'لغو هم‌زمان', 2, now),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('checks the injected clock after waiting on the common business lock', async () => {
    const a = await booking(),
      tx = await pool.connect();
    await tx.query('BEGIN');
    await tx.query('SELECT id FROM app.businesses WHERE id=$1 FOR UPDATE', [data.business]);
    const running = ops.outcome(
      command(),
      data.business,
      a.id,
      { status: 'completed', reason: null },
      1,
    );
    // Poll pg_locks rather than assuming a request has reached the lock after a fixed delay.
    for (let i = 0; i < 100; i++) {
      const r = await pool.query(
        "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id FROM app.businesses%'",
      );
      if (r.rowCount) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    now = new Date(a.ends_at);
    await tx.query('COMMIT');
    tx.release();
    expect((await running).status).toBe('completed');
  });
  it('blocks public/manual/reschedule capacity, keeps reasons private and releases atomically', async () => {
    const cmd = command(data.owner, 'block-create');
    const b = await ops.createBlock(cmd, data.business, block());
    expect((await ops.createBlock(cmd, data.business, block())).id).toBe(b.id);
    await expect(booking()).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' });
    const options = await store.options(
      data.owner,
      data.business,
      { service_id: data.service, staff_id: data.staff, from: '2026-11-03', to: '2026-11-03' },
      now,
    );
    expect(JSON.stringify(options)).not.toContain(block().reason);
    expect(options.days[0]?.slots.some((s) => s.starts_at === input().starts_at)).toBe(false);
    await expect(
      store.create(command(data.owner, 'manual'), input({ customer_mobile: null }), now),
    ).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' });
    const overview = await ops.overview(data.owner, data.business, {
      date: '2026-11-03',
      to: '2026-11-03',
      limit: 20,
    });
    expect(overview.blocks[0]?.reason).toBe(block().reason);
    const release = command(data.owner, 'block-release');
    const freed = await ops.releaseBlock(release, data.business, b.id, 'پایان استراحت', 1);
    expect(freed).toMatchObject({ version: 2, release_reason: 'پایان استراحت' });
    expect(
      (await ops.resolveBlock(data.owner, data.business, cmd.key, 'block-create')).released_at,
    ).not.toBeNull();
    expect((await ops.releaseBlock(release, data.business, b.id, 'پایان استراحت', 1)).version).toBe(
      2,
    );
    expect((await booking()).status).toBe('confirmed');
  });
  it('allows exactly one winner for block vs online creation and adjacent intervals do not overlap', async () => {
    const results = await Promise.allSettled([
      booking(),
      ops.createBlock(command(data.owner, 'block-create'), data.business, block()),
    ]);
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const allocations = (
      await pool.query(
        'SELECT count(*)::int n FROM app.schedule_allocations WHERE released_at IS NULL',
      )
    ).rows[0];
    expect(allocations.n).toBe(1);
    await ops.createBlock(command(data.owner, 'block-create'), data.business, {
      ...block(),
      starts_at: '2026-11-03T08:00:00.000Z',
      ends_at: '2026-11-03T08:30:00.000Z',
    });
  });
  it('never excludes blocks when rescheduling excludes its own current appointment', async () => {
    const a = await store.create(
      command(actor, 'online'),
      input({ starts_at: '2026-11-05T07:00:00.000Z' }),
      now,
    );
    await ops.createBlock(command(data.owner, 'block-create'), data.business, {
      ...block(),
      starts_at: '2026-11-06T07:00:00.000Z',
      ends_at: '2026-11-06T07:30:00.000Z',
    });
    const options = await changes.options(
      actor,
      a.id,
      { staff_id: data.staff, from: '2026-11-06', to: '2026-11-06' },
      now,
    );
    expect(options.days[0]?.slots.some((s) => s.starts_at === '2026-11-06T07:00:00.000Z')).toBe(
      false,
    );
    await expect(
      changes.reschedule(
        command(actor, 'reschedule'),
        a.id,
        { staff_id: data.staff, starts_at: '2026-11-06T07:00:00.000Z' },
        1,
        now,
      ),
    ).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' });
    expect((await store.get(actor, a.id)).starts_at).toBe(a.starts_at);
  });
  it('rejects block conflicts/tenant/stale input and protects direct ledger/history writes', async () => {
    const b = await ops.createBlock(command(data.owner, 'block-create'), data.business, block());
    await expect(
      ops.createBlock(command(data.owner, 'block-create'), data.business, block()),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      ops.releaseBlock(command(actor, 'block-release'), data.business, b.id, 'رفع غیرمجاز', 1),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      ops.releaseBlock(command(data.owner, 'block-release'), data.business, b.id, 'نسخه قدیمی', 2),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(
      pool.query('UPDATE app.schedule_blocks SET reason=$2 WHERE id=$1', [b.id, 'دستکاری']),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query('DELETE FROM app.schedule_allocations WHERE block_id=$1', [b.id]),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query('UPDATE app.schedule_allocations SET released_at=now() WHERE block_id=$1', [b.id]),
    ).rejects.toMatchObject({ code: '23514' });
    const a = await store.create(command(actor, 'online'), input({ staff_id: data.second }), now);
    await expect(
      pool.query("UPDATE app.appointments SET status='completed',version=2 WHERE id=$1", [a.id]),
    ).rejects.toMatchObject({ code: '23514' });
  });
  it('requires a non-null release reason even for a direct paired DB write', async () => {
    const b = await ops.createBlock(command(data.owner, 'block-create'), data.business, block());
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      await expect(
        tx.query(
          'UPDATE app.schedule_blocks SET version=2,released_at=now(),released_by=$2 WHERE id=$1',
          [b.id, data.owner],
        ),
      ).rejects.toMatchObject({ code: '23514' });
    } finally {
      await tx.query('ROLLBACK');
      tx.release();
    }
    expect(
      (await ops.overview(data.owner, data.business, { date: '2026-11-03', limit: 20 })).blocks[0]
        ?.version,
    ).toBe(1);
  });
  it('counts all seven days before filtering/page limits and separates awaiting result from no-show', async () => {
    const a = await booking();
    await store.create(
      command(actor, 'online'),
      input({ starts_at: '2026-11-05T07:00:00.000Z' }),
      now,
    );
    now = new Date(a.ends_at);
    const q = { date: '2026-11-03', to: '2026-11-09', limit: 1, status: 'no_show' as const };
    const result = await ops.overview(data.owner, data.business, q);
    expect(result.summary).toMatchObject({
      total: 2,
      confirmed: 2,
      awaiting_outcome: 1,
      no_show: 0,
    });
    expect((await store.list(data.owner, q, now, data.business)).items).toHaveLength(0);
    await ops.outcome(command(), data.business, a.id, { status: 'completed', reason: null }, 1);
    expect((await ops.overview(data.owner, data.business, q)).summary).toMatchObject({
      completed: 1,
      awaiting_outcome: 0,
    });
  });
  it('serves secured HTTP contracts and rejects CSRF, missing version and extra fields', async () => {
    const a = await booking(),
      c = await cookie(data.owner),
      other = await cookie(actor),
      base = '/api/v1/businesses/' + data.business;
    now = new Date(a.ends_at);
    const post = (suffix: string, cookieValue = c) =>
      request(fixture.app.getHttpServer())
        .post(base + suffix)
        .set('Cookie', cookieValue)
        .set('Origin', 'http://localhost:3000')
        .set('Idempotency-Key', randomUUID());
    expect(
      (await post('/appointments/' + a.id + '/outcome').send({ status: 'completed' })).status,
    ).toBe(428);
    expect(
      (
        await post('/appointments/' + a.id + '/outcome')
          .set('If-Match', '"1"')
          .send({ status: 'completed', version: 99 })
      ).status,
    ).toBe(422);
    expect(
      (
        await post('/appointments/' + a.id + '/outcome', other)
          .set('If-Match', '"1"')
          .send({ status: 'completed' })
      ).status,
    ).toBe(404);
    expect(
      (
        await post('/appointments/' + a.id + '/outcome')
          .set('Origin', 'https://evil.invalid')
          .set('If-Match', '"1"')
          .send({ status: 'completed' })
      ).status,
    ).toBe(403);
    const done = await post('/appointments/' + a.id + '/outcome')
      .set('If-Match', '"1"')
      .send({ status: 'completed' });
    expect(done.status).toBe(200);
    expect(done.headers['cache-control']).toBe('no-store');
    const get = (path: string, cookieValue = c) =>
      request(fixture.app.getHttpServer())
        .get(base + path)
        .set('Cookie', cookieValue);
    const result = await get('/agenda-overview?date=2026-11-03&to=2026-11-09');
    expect(result.status).toBe(200);
    expect(result.body.data.summary.completed).toBe(1);
    expect((await get('/agenda-overview?date=2026-11-03&to=2026-11-10')).status).toBe(422);
    expect((await get('/agenda-overview?date=2026-11-03', other)).status).toBe(404);
    expect(fixture.app.get(DatabaseProvider)).toBeDefined();
  });
  it('replays simultaneous blocks once and rejects orphan/XOR allocations at commit', async () => {
    const cmd = command(data.owner, 'block-create');
    const results = await Promise.all(
      Array.from({ length: 6 }, () => ops.createBlock(cmd, data.business, block())),
    );
    expect(new Set(results.map((b) => b.id)).size).toBe(1);
    await expect(
      ops.createBlock({ ...cmd, fingerprint: 'changed' }, data.business, block()),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await expect(
      ops.resolveBlock(actor, data.business, cmd.key, 'block-create'),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      pool.query(
        "INSERT INTO app.schedule_blocks(business_id,staff_id,staff_name,starts_at,ends_at,reason,created_by) VALUES($1,$2,'متخصص','2026-11-03T08:00:00Z','2026-11-03T08:30:00Z','بدون تخصیص',$3)",
        [data.business, data.staff, data.owner],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        "INSERT INTO app.schedule_allocations(business_id,staff_id,occupied_start,occupied_end) VALUES($1,$2,'2026-11-03T09:00:00Z','2026-11-03T09:30:00Z')",
        [data.business, data.staff],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
  it('serializes rescheduling against blocking and preserves the old booking if blocking wins', async () => {
    const a = await store.create(
      command(actor, 'online'),
      input({ starts_at: '2026-11-05T07:00:00.000Z' }),
      now,
    );
    const destination = '2026-11-06T07:00:00.000Z';
    const results = await Promise.allSettled([
      changes.reschedule(
        command(actor, 'reschedule'),
        a.id,
        { staff_id: data.staff, starts_at: destination },
        1,
        now,
      ),
      ops.createBlock(command(data.owner, 'block-create'), data.business, {
        ...block(),
        starts_at: destination,
        ends_at: '2026-11-06T07:30:00.000Z',
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await store.get(actor, a.id)).starts_at).toBe(
      results[0]?.status === 'fulfilled' ? destination : a.starts_at,
    );
  });
});
