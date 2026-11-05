import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { describe, beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { createTestDatabase } from './helpers/test-database.js';
import { runMigration } from './helpers/run-migration.js';
import { createTestApplication } from './helpers/create-test-application.js';
import { seedAvailability } from './helpers/availability-fixture.js';
import { BookingStore } from '../src/modules/bookings/application/booking-store.js';
import { DatabaseProvider } from '../src/database/database.provider.js';
import { BusinessWriteTransaction } from '../src/modules/salon-management/infrastructure/persistence/business-write-transaction.js';
import type {
  BookingCommand,
  CreateBooking,
  Appointment,
} from '../src/modules/bookings/domain/booking.types.js';
const initial = new Date('2026-11-03T06:00:00Z');
describe('atomic booking ledger on real PostgreSQL and Nest', () => {
  let target: Awaited<ReturnType<typeof createTestDatabase>>,
    pool: Pool,
    fixture: Awaited<ReturnType<typeof createTestApplication>>,
    data: Awaited<ReturnType<typeof seedAvailability>>,
    store: BookingStore,
    write: BusinessWriteTransaction,
    actor: string,
    now = initial;
  beforeAll(async () => {
    target = await createTestDatabase();
    const m = await runMigration(target.url);
    expect(m.status, m.output).toBe(0);
    pool = new Pool({ connectionString: target.url, max: 12 });
    fixture = await createTestApplication('test', [], target.url, { now: () => now });
    // This suite tests 100 queued contenders, not the production pool's one-second load limit.
    fixture.app.get(DatabaseProvider).pool.options.connectionTimeoutMillis = 10_000;
    store = fixture.app.get(BookingStore);
    write = fixture.app.get(BusinessWriteTransaction);
  });
  beforeEach(async () => {
    now = initial;
    await pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
    data = await seedAvailability(pool, '2026-11-03');
    actor = await user();
  });
  afterAll(async () => {
    await fixture?.app.close();
    await pool?.end();
    await target?.close();
  });
  async function user() {
    const id = randomUUID();
    await pool.query('INSERT INTO app.users(id,email) VALUES($1,$2)', [id, id + '@example.com']);
    return id;
  }
  function command(
    who = actor,
    operation: BookingCommand['operation'] = 'online',
    key = randomUUID(),
    fingerprint = key,
  ): BookingCommand {
    return { actor: who, operation, key, fingerprint };
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
  async function counts() {
    return (
      await pool.query(
        'SELECT (SELECT count(*)::integer FROM app.appointments) appointments,(SELECT count(*)::integer FROM app.schedule_allocations WHERE released_at IS NULL) allocations,(SELECT count(*)::integer FROM app.booking_events) events,(SELECT count(*)::integer FROM app.booking_writes) writes',
      )
    ).rows[0];
  }
  async function cookie(who: string) {
    const token = randomBytes(32).toString('base64url');
    await pool.query(
      "INSERT INTO app.sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [who, createHash('sha256').update(token).digest('hex')],
    );
    return 'hair_salon_session=' + token;
  }
  const get = (url: string, c: string) =>
    request(fixture.app.getHttpServer())
      .get('/api/v1/' + url)
      .set('Cookie', c);
  it('exactly one of 100 independent contenders commits a booking, allocation, event and intent', async () => {
    const actors = await Promise.all(Array.from({ length: 100 }, () => user()));
    const results = await Promise.allSettled(
      actors.map((a) => store.create(command(a), input(), now)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    for (const r of results)
      if (r.status === 'rejected')
        expect(r.reason).toMatchObject({ status: 409, code: 'SLOT_UNAVAILABLE' });
    expect(await counts()).toEqual({ appointments: 1, allocations: 1, events: 1, writes: 1 });
  });
  it('replays one resource concurrently, rejects changed fingerprints and returns cancelled current state', async () => {
    const cmd = command();
    const results = await Promise.all(
      Array.from({ length: 12 }, () => store.create(cmd, input(), now)),
    );
    expect(new Set(results.map((a) => a.id)).size).toBe(1);
    const a = results[0]!;
    await expect(
      store.create({ ...cmd, fingerprint: 'different' }, input(), now),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    const cancelled = await store.cancel(
      command(data.owner, 'cancel'),
      data.business,
      a.id,
      'هماهنگی تلفنی با مشتری',
      1,
      now,
    );
    expect(cancelled.status).toBe('cancelled');
    expect((await store.create(cmd, input(), now)).id).toBe(a.id);
    expect((await store.resolve(actor, cmd.key, 'online')).status).toBe('cancelled');
    expect(await counts()).toEqual({ appointments: 1, allocations: 0, events: 2, writes: 2 });
  });
  it('online and manual share capacity; any chooses remaining staff deterministically', async () => {
    const contender = await user();
    const results = await Promise.allSettled([
      store.create(command(), input(), now),
      store.create(command(data.owner, 'manual'), input({ customer_mobile: null }), now),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const a = await store.create(command(contender), input({ staff_id: 'any' }), now);
    expect(a.staff_id).toBe(data.second);
    await expect(
      store.create(command(await user()), input({ staff_id: 'any' }), now),
    ).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' });
    expect(await counts()).toMatchObject({ appointments: 2, allocations: 2 });
  });
  it('subtracts buffers from public capacity, supports free non-grid durations and never exposes contact', async () => {
    await store.create(command(), input(), now);
    const r = await request(fixture.app.getHttpServer())
      .get(
        `/api/v1/catalog/salons/${data.business}/availability?service_id=${data.service}&staff_id=${data.staff}`,
      )
      .expect(200);
    expect(r.body.data.days[0].slots.map((s: { start_local: string }) => s.start_local)).toEqual([
      '11:15',
    ]);
    expect(JSON.stringify(r.body)).not.toMatch(/مشتری آزمون|09123456789|customer_|snapshot/);
    const free = await store.create(
      command(),
      input({
        service_id: data.freeService,
        starts_at: '2026-11-05T07:00:00.000Z',
        expected_price_irr: 0,
        expected_duration_minutes: 17,
      }),
      now,
    );
    expect(free.snapshot.price_irr).toBe(0);
    expect(Date.parse(free.ends_at) - Date.parse(free.starts_at)).toBe(17 * 60000);
  });
  it('caps future online bookings atomically and leaves manual contact unlinked', async () => {
    const dates = ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
    const results = await Promise.allSettled(
      dates.map((d) => store.create(command(), input({ starts_at: d + 'T07:00:00.000Z' }), now)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    for (const r of results)
      if (r.status === 'rejected')
        expect(r.reason).toMatchObject({ code: 'CUSTOMER_BOOKING_LIMIT' });
    const a = await store.create(
      command(data.owner, 'manual'),
      input({ starts_at: '2026-11-09T07:00:00.000Z' }),
      now,
    );
    await expect(store.get(actor, a.id)).rejects.toMatchObject({ status: 404 });
    expect((await store.list(actor, { limit: 20, period: 'upcoming' }, now)).items).toHaveLength(3);
  });
  it('rejects stale price, closed/off-grid/buffer starts and unapproved near-term manual bookings', async () => {
    for (const patch of [
      { expected_price_irr: 0 },
      { starts_at: '2026-11-04T07:00:00.000Z' },
      { starts_at: '2026-11-03T07:01:00.000Z' },
      { starts_at: '2026-11-03T06:30:00.000Z' },
    ])
      await expect(store.create(command(), input(patch), now)).rejects.toMatchObject({
        status: 409,
      });
    now = new Date('2026-11-03T06:45:00Z');
    await expect(store.create(command(data.owner, 'manual'), input(), now)).rejects.toMatchObject({
      code: 'NOTICE_REASON_REQUIRED',
    });
    const a = await store.create(
      command(data.owner, 'manual'),
      input({ notice_override_reason: 'مراجعه فوری و هماهنگ' }),
      now,
    );
    expect(a.status).toBe('confirmed');
    expect(await counts()).toMatchObject({ appointments: 1 });
  });
  it('preserves snapshots after archive/unpublication and permits manual use of valid draft', async () => {
    const a = await store.create(command(), input(), now);
    await pool.query(
      'UPDATE app.services SET active=false,price_irr=0,category_id=NULL WHERE id=$1',
      [data.service],
    );
    await pool.query(
      "UPDATE app.businesses SET state='draft',current_request_id=NULL WHERE id=$1",
      [data.business],
    );
    expect((await store.get(actor, a.id)).snapshot).toEqual(a.snapshot);
    expect((await store.get(data.owner, a.id, data.business)).snapshot.price_irr).toBe(2500000);
    await expect(
      store.create(command(await user()), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now),
    ).rejects.toMatchObject({ status: 404 });
    await pool.query(
      "UPDATE app.services SET active=true,price_irr=2500000,category_id='haircut' WHERE id=$1",
      [data.service],
    );
    const manual = await store.create(
      command(data.owner, 'manual'),
      input({ starts_at: '2026-11-05T07:00:00.000Z', customer_mobile: null }),
      now,
    );
    expect(manual.source).toBe('manual');
  });
  it('rolls back incompatible schedule/staff changes under the shared business lock', async () => {
    await store.create(command(), input(), now);
    const cmd = {
      actorId: data.owner,
      businessId: data.business,
      key: randomUUID(),
      fingerprint: 'schedule',
      operation: 'hours.replace',
      requestId: 'test',
    };
    for (const sql of [
      'DELETE FROM app.staff_hours WHERE business_id=$1',
      'UPDATE app.staff_profiles SET active=false WHERE business_id=$1',
      'DELETE FROM app.staff_services WHERE business_id=$1',
    ])
      await expect(
        write.run({ ...cmd, key: randomUUID() }, async (tx) => {
          await tx.query(sql, [data.business]);
          return { id: data.business };
        }),
      ).rejects.toMatchObject({ code: 'EXISTING_BOOKING_CONFLICT' });
    expect(
      (await pool.query('SELECT state FROM app.businesses WHERE id=$1', [data.business])).rows[0]
        .state,
    ).toBe('published');
    await expect(
      write.run({ ...cmd, key: randomUUID() }, async (tx) => {
        await tx.query('UPDATE app.services SET active=false,category_id=NULL WHERE id=$1', [
          data.service,
        ]);
        return { id: data.service };
      }),
    ).resolves.toBeTruthy();
  });
  it('serializes booking versus schedule removal without admitting an invalid allocation', async () => {
    const results = await Promise.allSettled([
      store.create(command(), input(), now),
      write.run(
        {
          actorId: data.owner,
          businessId: data.business,
          key: randomUUID(),
          fingerprint: 'race',
          operation: 'hours.replace',
          requestId: 'test',
        },
        async (tx) => {
          await tx.query('DELETE FROM app.staff_hours WHERE business_id=$1', [data.business]);
          return { id: data.business };
        },
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('enforces ledger consistency, frozen snapshots and exclusion even outside the application', async () => {
    const a = await store.create(command(), input(), now);
    await expect(
      pool.query(
        "UPDATE app.appointments SET snapshot=jsonb_set(snapshot,'{price_irr}','0') WHERE id=$1",
        [a.id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      await tx.query(
        "UPDATE app.appointments SET status='cancelled',version=2,cancelled_at=$2,cancellation_reason='بدون آزادسازی' WHERE id=$1",
        [a.id, now],
      );
      await expect(tx.query('COMMIT')).rejects.toMatchObject({ code: '23514' });
      await tx.query('ROLLBACK');
      await tx.query('BEGIN');
      const id = randomUUID();
      await tx.query(
        `INSERT INTO app.appointments(id,business_id,service_id,staff_id,booking_user_id,created_by,code,source,starts_at,ends_at,snapshot) SELECT $2::uuid,business_id,service_id,staff_id,booking_user_id,created_by,($2::uuid)::text,source,starts_at,ends_at,snapshot FROM app.appointments WHERE id=$1`,
        [a.id, id],
      );
      await tx.query(
        "INSERT INTO app.booking_events(appointment_id,version,actor_id,action) VALUES($1,1,$2,'created')",
        [id, actor],
      );
      await expect(tx.query('COMMIT')).rejects.toMatchObject({ code: '23514' });
      await tx.query('ROLLBACK');
      await tx.query('BEGIN');
      const next = randomUUID();
      await tx.query(
        `INSERT INTO app.appointments(id,business_id,service_id,staff_id,booking_user_id,created_by,code,source,starts_at,ends_at,snapshot) SELECT $2::uuid,business_id,service_id,staff_id,booking_user_id,created_by,($2::uuid)::text,source,starts_at,ends_at,snapshot FROM app.appointments WHERE id=$1`,
        [a.id, next],
      );
      await expect(
        tx.query(
          'INSERT INTO app.schedule_allocations(appointment_id,business_id,staff_id,occupied_start,occupied_end) SELECT $2::uuid,business_id,staff_id,occupied_start,occupied_end FROM app.schedule_allocations WHERE appointment_id=$1',
          [a.id, next],
        ),
      ).rejects.toMatchObject({ code: '23P01' });
      await tx.query('ROLLBACK');
    } finally {
      await tx.query('ROLLBACK');
      tx.release();
    }
    expect(await counts()).toEqual({ appointments: 1, allocations: 1, events: 1, writes: 1 });
  });
  it('rechecks the clock after the shared lock and replays a committed intent beyond the creation horizon', async () => {
    const cmd = command();
    const a = await store.create(cmd, input(), initial);
    now = new Date('2026-12-20T06:00:00Z');
    expect((await store.create(cmd, input(), initial)).id).toBe(a.id);
    await expect(
      store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), initial),
    ).rejects.toMatchObject({ status: 422 });
    now = new Date('2026-11-03T06:01:00Z');
    await expect(
      store.create(command(await user()), input({ staff_id: data.second }), initial),
    ).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });
  it('rejects foreign tenant writes/details and never resolves another actor intent', async () => {
    const a = await store.create(command(), input(), now),
      foreign = await seedAvailability(pool, '2026-11-03');
    await expect(store.get(foreign.owner, a.id, data.business)).rejects.toMatchObject({
      status: 404,
    });
    await expect(store.get(data.owner, a.id, foreign.business)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      store.create(command(foreign.owner, 'manual'), input(), now),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      store.cancel(
        command(foreign.owner, 'cancel'),
        data.business,
        a.id,
        'تماس هماهنگ شده',
        1,
        now,
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(store.resolve(foreign.owner, 'missing', 'online')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('cancellation frees capacity atomically, rejects started/stale writes and preserves history', async () => {
    const a = await store.create(command(), input(), now);
    await expect(
      store.cancel(command(data.owner, 'cancel'), data.business, a.id, 'هماهنگ شده', 2, now),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(
      store.cancel(
        command(data.owner, 'cancel'),
        data.business,
        a.id,
        'هماهنگ شده',
        1,
        new Date(a.starts_at),
      ),
    ).rejects.toMatchObject({ code: 'APPOINTMENT_STARTED' });
    const cmd = command(data.owner, 'cancel');
    await store.cancel(cmd, data.business, a.id, 'هماهنگی تلفنی', 1, now);
    expect((await store.cancel(cmd, data.business, a.id, 'هماهنگی تلفنی', 1, now)).status).toBe(
      'cancelled',
    );
    await store.create(command(await user()), input(), now);
    expect(await counts()).toEqual({ appointments: 2, allocations: 1, events: 3, writes: 3 });
  });
  it('enforces customer/tenant HTTP authorization, CSRF, contact validation and creation quota', async () => {
    const c = await cookie(actor),
      owner = await cookie(data.owner),
      other = await cookie(await user());
    const body = input();
    const url = '/api/v1/appointments';
    const post = (cookie: string, value: object, key = randomUUID()) =>
      request(fixture.app.getHttpServer())
        .post(url)
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', cookie)
        .set('Idempotency-Key', key)
        .send(value);
    // Domain command has an internal null override field; online HTTP input deliberately excludes it.
    const { notice_override_reason: _unused, ...online } = body;
    const response = await post(c, online).expect(201),
      a: Appointment = response.body.data;
    expect(response.headers['cache-control']).toBe('no-store');
    await get('appointments/' + a.id, c).expect(200);
    await get('appointments/' + a.id, other).expect(404);
    await get(`businesses/${data.business}/appointments?date=2026-11-03`, other).expect(404);
    await get(`businesses/${data.business}/appointments?date=2026-11-03`, owner).expect(200);
    await request(fixture.app.getHttpServer())
      .get('/api/v1/appointments/' + a.id)
      .expect(401);
    await request(fixture.app.getHttpServer())
      .post(url)
      .set('Cookie', c)
      .set('Origin', 'https://evil.invalid')
      .set('Idempotency-Key', randomUUID())
      .send(online)
      .expect(403);
    await post(c, { ...online, customer_mobile: 'invalid' }).expect(422);
    await post(c, { ...online, status: 'confirmed' }).expect(422);
    await pool.query(
      "UPDATE app.auth_attempt_buckets SET attempts=10 WHERE operation='booking-create'",
    );
    const limited = await post(c, online).expect(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(JSON.stringify(fixture.logger.entries)).not.toContain('09123456789');
  });
});
