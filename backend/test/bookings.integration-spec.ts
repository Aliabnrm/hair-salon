import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { describe, beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { createTestDatabase } from './helpers/test-database.js';
import { runMigration } from './helpers/run-migration.js';
import { createTestApplication } from './helpers/create-test-application.js';
import { seedAvailability } from './helpers/availability-fixture.js';
import { BookingChangesStore } from '../src/modules/bookings/application/booking-changes-store.js';
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
    changes: BookingChangesStore,
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
    changes = fixture.app.get(BookingChangesStore);
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
  it('moves the same receipt with agreed commercial snapshot and shared customer/owner history', async () => {
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now);
    await pool.query(
      'UPDATE app.services SET price_irr=9900000,duration_minutes=180,buffer_before_minutes=60,version=version+1 WHERE id=$1',
      [data.service],
    );
    const b = await changes.reschedule(
      command(actor, 'reschedule'),
      a.id,
      { staff_id: data.second, starts_at: '2026-11-06T07:00:00.000Z' },
      1,
      now,
    );
    expect(b).toMatchObject({
      id: a.id,
      code: a.code,
      version: 2,
      staff_id: data.second,
      starts_at: '2026-11-06T07:00:00.000Z',
      snapshot: { ...a.snapshot, staff_name: 'متخصص دوم' },
    });
    const history = await changes.changes(actor, a.id, now);
    expect(history).toEqual(await changes.changes(data.owner, a.id, now, data.business));
    expect(history.items[0]).toMatchObject({
      version: 2,
      action: 'rescheduled',
      actor: 'customer',
      before: { starts_at: a.starts_at, staff_id: data.staff },
      after: { starts_at: b.starts_at, staff_id: data.second },
    });
    expect(JSON.stringify(history)).not.toContain('actor_id');
    expect(await counts()).toEqual({ appointments: 1, allocations: 1, events: 2, writes: 2 });
    const allocation = (
      await pool.query(
        'SELECT staff_id,occupied_start,occupied_end FROM app.schedule_allocations WHERE appointment_id=$1',
        [a.id],
      )
    ).rows[0];
    expect(allocation.staff_id).toBe(data.second);
    expect(allocation.occupied_start.toISOString()).toBe('2026-11-06T06:50:00.000Z');
    expect(allocation.occupied_end.toISOString()).toBe('2026-11-06T07:35:00.000Z');
  });
  it('replacement options exclude exactly the current allocation and use the original duration/buffers', async () => {
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now);
    const options = await changes.options(
      actor,
      a.id,
      { staff_id: data.staff, from: '2026-11-05', to: '2026-11-05' },
      now,
    );
    expect(options.policy.minimum_notice_minutes).toBe(120);
    expect(options.staff.map((s) => s.id)).not.toContain(data.hidden);
    expect(options.days[0]?.slots.some((s) => s.starts_at === '2026-11-05T07:15:00.000Z')).toBe(
      true,
    );
    const b = await changes.reschedule(
      command(actor, 'reschedule'),
      a.id,
      { staff_id: data.staff, starts_at: '2026-11-05T07:15:00.000Z' },
      1,
      now,
    );
    expect(b.starts_at).toBe('2026-11-05T07:15:00.000Z');
  });
  it('rejects occupied, hidden, closed, off-grid and unchanged replacements without losing the original', async () => {
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now);
    await store.create(
      command(await user()),
      input({ starts_at: '2026-11-06T07:00:00.000Z' }),
      now,
    );
    for (const replacement of [
      { staff_id: data.staff, starts_at: '2026-11-06T07:00:00.000Z' },
      { staff_id: data.hidden, starts_at: '2026-11-07T07:00:00.000Z' },
      { staff_id: data.staff, starts_at: '2026-11-04T07:00:00.000Z' },
      { staff_id: data.staff, starts_at: '2026-11-07T07:01:00.000Z' },
      { staff_id: data.staff, starts_at: a.starts_at },
    ])
      await expect(
        changes.reschedule(command(actor, 'reschedule'), a.id, replacement, 1, now),
      ).rejects.toMatchObject({ status: expect.any(Number) });
    expect(await store.get(actor, a.id)).toEqual(a);
    expect(await counts()).toEqual({ appointments: 2, allocations: 2, events: 2, writes: 2 });
  });
  it('customer cancellation is allowed at the exact deadline even on an unpublished salon and releases capacity', async () => {
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now);
    await pool.query(
      "UPDATE app.businesses SET state='draft',current_request_id=NULL WHERE id=$1",
      [data.business],
    );
    now = new Date('2026-11-05T05:00:00Z');
    const cmd = command(actor, 'customer-cancel');
    expect((await changes.changes(actor, a.id, now)).customer_can_change).toBe(true);
    const cancelled = await changes.cancel(cmd, a.id, 'تغییر برنامه شخصی', 1, now);
    expect(cancelled.status).toBe('cancelled');
    expect(await changes.cancel(cmd, a.id, 'تغییر برنامه شخصی', 1, now)).toEqual(cancelled);
    expect(await counts()).toEqual({ appointments: 1, allocations: 0, events: 2, writes: 2 });
  });
  it('checks current deadline, version and replacement notice; rejects late changes without altering the receipt', async () => {
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now);
    await expect(
      changes.cancel(command(actor, 'customer-cancel'), a.id, 'تغییر برنامه', 2, now),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    now = new Date('2026-11-05T05:00:00.001Z');
    expect((await changes.changes(actor, a.id, now)).customer_can_change).toBe(false);
    await expect(
      changes.cancel(command(actor, 'customer-cancel'), a.id, 'تغییر برنامه', 1, now),
    ).rejects.toMatchObject({ code: 'CHANGE_DEADLINE_PASSED' });
    await expect(
      changes.reschedule(
        command(actor, 'reschedule'),
        a.id,
        { staff_id: data.staff, starts_at: '2026-11-06T07:00:00.000Z' },
        1,
        now,
      ),
    ).rejects.toMatchObject({ code: 'CHANGE_DEADLINE_PASSED' });
    expect(await store.get(actor, a.id)).toEqual(a);
    now = new Date('2026-11-03T06:00:00Z');
    await expect(
      changes.reschedule(
        command(actor, 'reschedule'),
        a.id,
        { staff_id: data.second, starts_at: '2026-11-03T07:45:00.000Z' },
        1,
        now,
      ),
    ).rejects.toMatchObject({ code: 'REPLACEMENT_TOO_SOON' });
  });
  it('serializes two appointments moving to one replacement and preserves the loser', async () => {
    const other = await user();
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now);
    const b = await store.create(
      command(other),
      input({ starts_at: '2026-11-07T07:00:00.000Z' }),
      now,
    );
    const destination = { staff_id: data.staff, starts_at: '2026-11-06T07:00:00.000Z' };
    const results = await Promise.allSettled([
      changes.reschedule(command(actor, 'reschedule'), a.id, destination, 1, now),
      changes.reschedule(command(other, 'reschedule'), b.id, destination, 1, now),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const receipts = [await store.get(actor, a.id), await store.get(other, b.id)];
    expect(receipts.filter((r) => r.starts_at === destination.starts_at)).toHaveLength(1);
    expect(receipts.filter((r) => r.version === 1)).toHaveLength(1);
    expect(await counts()).toEqual({ appointments: 2, allocations: 2, events: 3, writes: 3 });
  });
  it('serializes cancellation versus rescheduling and rescheduling versus a new booking', async () => {
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now);
    const destination = { staff_id: data.staff, starts_at: '2026-11-06T07:00:00.000Z' };
    const pair = await Promise.allSettled([
      changes.reschedule(command(actor, 'reschedule'), a.id, destination, 1, now),
      changes.cancel(command(actor, 'customer-cancel'), a.id, 'تغییر برنامه', 1, now),
    ]);
    expect(pair.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await store.get(actor, a.id)).version).toBe(2);
    const b = await store.create(command(), input({ starts_at: '2026-11-08T07:00:00.000Z' }), now);
    const pair2 = await Promise.allSettled([
      changes.reschedule(
        command(actor, 'reschedule'),
        b.id,
        { ...destination, starts_at: '2026-11-09T07:00:00.000Z' },
        1,
        now,
      ),
      store.create(command(await user()), input({ starts_at: '2026-11-09T07:00:00.000Z' }), now),
    ]);
    expect(pair2.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('replays one reschedule intent, recovers its latest state and never exposes another actor intent', async () => {
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now),
      cmd = command(actor, 'reschedule');
    const replacement = { staff_id: data.second, starts_at: '2026-11-06T07:00:00.000Z' };
    const copies = await Promise.all(
      Array.from({ length: 8 }, () => changes.reschedule(cmd, a.id, replacement, 1, now)),
    );
    expect(copies.every((b) => b.id === a.id && b.version === 2)).toBe(true);
    await expect(
      changes.reschedule({ ...cmd, fingerprint: 'different' }, a.id, replacement, 1, now),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await changes.cancel(command(actor, 'customer-cancel'), a.id, 'تغییر برنامه', 2, now);
    expect((await store.resolve(actor, cmd.key, 'reschedule')).status).toBe('cancelled');
    await expect(store.resolve(await user(), cmd.key, 'reschedule')).rejects.toMatchObject({
      status: 404,
    });
    expect(await counts()).toEqual({ appointments: 1, allocations: 0, events: 3, writes: 3 });
  });
  it('rechecks the two-hour deadline after waiting for the shared salon lock', async () => {
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now);
    const blocker = await pool.connect();
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM app.businesses WHERE id=$1 FOR UPDATE', [data.business]);
    const pending = changes.reschedule(
      command(actor, 'reschedule'),
      a.id,
      { staff_id: data.staff, starts_at: '2026-11-06T07:00:00.000Z' },
      1,
      now,
    );
    const settled = pending.then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    try {
      let locked = false;
      for (let i = 0; i < 50; i++) {
        const r = await pool.query(
          "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id FROM app.businesses%'",
        );
        if (r.rowCount) {
          locked = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(locked).toBe(true);
      now = new Date('2026-11-05T05:00:00.001Z');
      await blocker.query('COMMIT');
      expect(await settled).toMatchObject({ error: { code: 'CHANGE_DEADLINE_PASSED' } });
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
    }
    expect(await store.get(actor, a.id)).toEqual(a);
  });
  it('HTTP protects customer changes, history, snapshots and manual/unowned appointments', async () => {
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now);
    const c = await cookie(actor),
      other = await cookie(await user());
    const url = `/api/v1/appointments/${a.id}/rescheduling`;
    const body = { staff_id: data.second, starts_at: '2026-11-06T07:00:00.000Z' };
    const post = (
      who = c,
      value: object = body,
      origin = 'http://localhost:3000',
      version = '"1"',
    ) =>
      request(fixture.app.getHttpServer())
        .post(url)
        .set('Cookie', who)
        .set('Origin', origin)
        .set('Idempotency-Key', randomUUID())
        .set('If-Match', version)
        .send(value);
    await request(fixture.app.getHttpServer()).post(url).send(body).expect(401);
    await post(c, body, 'https://evil.invalid').expect(403);
    await post(other).expect(404);
    await post(c, { ...body, price_irr: 0 }).expect(422);
    await post(c, body, 'http://localhost:3000', '"2"').expect(409);
    await request(fixture.app.getHttpServer())
      .post(url)
      .set('Cookie', c)
      .set('Origin', 'http://localhost:3000')
      .set('Idempotency-Key', randomUUID())
      .send(body)
      .expect(428);
    await get(`appointments/${a.id}/changes`, other).expect(404);
    const response = await get(
      `appointments/${a.id}/rescheduling-options?staff_id=${data.staff}&from=2026-11-05&to=2026-11-05`,
      c,
    ).expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toMatch(
      /customer_name|customer_mobile|نام خصوصی آزمون/,
    );
    await post().expect(200);
    const history = await get(`appointments/${a.id}/changes`, c).expect(200);
    expect(history.body.data.appointment.version).toBe(2);
    const manual = await store.create(
      command(data.owner, 'manual'),
      input({ starts_at: '2026-11-07T07:00:00.000Z' }),
      now,
    );
    await get(`appointments/${manual.id}/changes`, c).expect(404);
    await expect(
      changes.cancel(command(actor, 'customer-cancel'), manual.id, 'تغییر برنامه', 1, now),
    ).rejects.toMatchObject({ status: 404 });
    expect(JSON.stringify(fixture.logger.entries)).not.toContain('09123456789');
  });
  it('database rejects an unrecorded move, commercial snapshot changes and incomplete allocation moves', async () => {
    const a = await store.create(command(), input({ starts_at: '2026-11-05T07:00:00.000Z' }), now);
    await expect(
      pool.query(
        "UPDATE app.appointments SET starts_at=starts_at+interval '1 day',ends_at=ends_at+interval '1 day',version=2 WHERE id=$1",
        [a.id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    const tx = await pool.connect();
    const details = {
      before: {
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        staff_id: a.staff_id,
        staff_name: a.snapshot.staff_name,
      },
      after: {
        starts_at: '2026-11-06T07:00:00.000Z',
        ends_at: '2026-11-06T07:30:00.000Z',
        staff_id: a.staff_id,
        staff_name: a.snapshot.staff_name,
      },
    };
    try {
      await tx.query('BEGIN');
      await tx.query(
        "INSERT INTO app.booking_events(appointment_id,version,actor_id,action,details) VALUES($1,2,$2,'rescheduled',$3::jsonb)",
        [a.id, actor, JSON.stringify(details)],
      );
      await expect(
        tx.query(
          "UPDATE app.appointments SET starts_at=$2,ends_at=$3,snapshot=jsonb_set(snapshot,'{price_irr}','0'),version=2 WHERE id=$1",
          [a.id, details.after.starts_at, details.after.ends_at],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await tx.query('ROLLBACK');
      await tx.query('BEGIN');
      await tx.query(
        "INSERT INTO app.booking_events(appointment_id,version,actor_id,action,details) VALUES($1,2,$2,'rescheduled',$3::jsonb)",
        [a.id, actor, JSON.stringify(details)],
      );
      await tx.query('UPDATE app.appointments SET starts_at=$2,ends_at=$3,version=2 WHERE id=$1', [
        a.id,
        details.after.starts_at,
        details.after.ends_at,
      ]);
      await expect(tx.query('COMMIT')).rejects.toMatchObject({ code: '23514' });
    } finally {
      await tx.query('ROLLBACK');
      tx.release();
    }
    expect(await store.get(actor, a.id)).toEqual(a);
    const b = await changes.reschedule(
      command(actor, 'reschedule'),
      a.id,
      { staff_id: data.second, starts_at: details.after.starts_at },
      1,
      now,
    );
    await expect(
      pool.query(
        "UPDATE app.booking_events SET details='{}'::jsonb WHERE appointment_id=$1 AND version=2",
        [b.id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
  it.each([5, 6])(
    'upgrades the exact ledger through migration %i without rewriting existing receipts, events, allocations or intents',
    async (lastMigration) => {
      const upgrade = await createTestDatabase();
      const oldPool = new Pool({ connectionString: upgrade.url, max: 2 });
      const folder = await mkdtemp(join(tmpdir(), 'hair-salon-s8-upgrade-'));
      let app: Awaited<ReturnType<typeof createTestApplication>> | undefined;
      try {
        await mkdir(join(folder, 'meta'));
        const source = fileURLToPath(new URL('../drizzle/', import.meta.url));
        const journal = JSON.parse(await readFile(join(source, 'meta/_journal.json'), 'utf8'));
        journal.entries = journal.entries.filter((e: { idx: number }) => e.idx <= lastMigration);
        await writeFile(join(folder, 'meta/_journal.json'), JSON.stringify(journal));
        for (const entry of journal.entries)
          await copyFile(join(source, entry.tag + '.sql'), join(folder, entry.tag + '.sql'));
        await migrate(drizzle(oldPool), { migrationsFolder: folder });
        const legacy = await seedAvailability(oldPool, '2026-11-03'),
          id = randomUUID(),
          owner = legacy.owner;
        const snapshot = {
          business_name: 'سالن قبلی',
          business_address: 'نشانی عمومی آزمون',
          business_phone: '+989121234567',
          service_name: 'کوتاهی دقیق',
          staff_name: 'متخصص اول',
          price_irr: 2500000,
          duration_minutes: 30,
          buffer_before_minutes: 10,
          buffer_after_minutes: 5,
          service_version: 1,
          customer_name: 'مشتری قدیمی آزمون',
          customer_mobile: '09123456789',
          timezone: 'Asia/Tehran',
          policy: 'سیاست ثبت قبلی',
        };
        const tx = await oldPool.connect();
        try {
          await tx.query('BEGIN');
          await tx.query(
            "INSERT INTO app.appointments(id,business_id,service_id,staff_id,booking_user_id,created_by,code,source,starts_at,ends_at,snapshot) VALUES($1,$2,$3,$4,$5,$5,($1::uuid)::text,'online','2026-11-05T07:00:00Z','2026-11-05T07:30:00Z',$6::jsonb)",
            [id, legacy.business, legacy.service, legacy.staff, owner, JSON.stringify(snapshot)],
          );
          await tx.query(
            "INSERT INTO app.schedule_allocations(appointment_id,business_id,staff_id,occupied_start,occupied_end) VALUES($1,$2,$3,'2026-11-05T06:50:00Z','2026-11-05T07:35:00Z')",
            [id, legacy.business, legacy.staff],
          );
          await tx.query(
            "INSERT INTO app.booking_events(appointment_id,version,actor_id,action) VALUES($1,1,$2,'created')",
            [id, owner],
          );
          await tx.query(
            "INSERT INTO app.booking_writes(actor_id,operation,key,fingerprint,appointment_id) VALUES($1,'online','legacy-key','legacy-fingerprint',$2)",
            [owner, id],
          );
          await tx.query('COMMIT');
        } finally {
          await tx.query('ROLLBACK');
          tx.release();
        }
        const receiptsBefore = (await oldPool.query('SELECT * FROM app.appointments')).rows;
        const allocationsBefore = (
          await oldPool.query(
            'SELECT appointment_id,business_id,staff_id,occupied_start,occupied_end,released_at,occupied_range FROM app.schedule_allocations',
          )
        ).rows;
        const eventsBefore = (
          await oldPool.query(
            'SELECT appointment_id,version,actor_id,action,reason,occurred_at FROM app.booking_events',
          )
        ).rows;
        const writesBefore = (
          await oldPool.query(
            'SELECT actor_id,operation,key,fingerprint,appointment_id,created_at FROM app.booking_writes',
          )
        ).rows;
        const journalBefore = (
          await oldPool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')
        ).rows;
        const migrated = await runMigration(upgrade.url);
        expect(migrated.status, migrated.output).toBe(0);
        expect((await oldPool.query('SELECT * FROM app.appointments')).rows).toEqual(
          receiptsBefore,
        );
        expect(
          (
            await oldPool.query(
              'SELECT appointment_id,business_id,staff_id,occupied_start,occupied_end,released_at,occupied_range FROM app.schedule_allocations',
            )
          ).rows,
        ).toEqual(allocationsBefore);
        expect(
          (
            await oldPool.query(
              'SELECT appointment_id,version,actor_id,action,reason,occurred_at FROM app.booking_events',
            )
          ).rows,
        ).toEqual(eventsBefore);
        expect(
          (
            await oldPool.query(
              'SELECT actor_id,operation,key,fingerprint,appointment_id,created_at FROM app.booking_writes',
            )
          ).rows,
        ).toEqual(writesBefore);
        expect(
          (
            await oldPool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')
          ).rows.slice(0, lastMigration + 1),
        ).toEqual(journalBefore);
        app = await createTestApplication('test', [], upgrade.url, { now: () => initial });
        const upgraded = app.app.get(BookingChangesStore);
        expect((await upgraded.changes(owner, id, initial)).items[0]?.after).toBeNull();
        const moved = await upgraded.reschedule(
          { actor: owner, operation: 'reschedule', key: randomUUID(), fingerprint: 'upgrade' },
          id,
          { staff_id: legacy.second, starts_at: '2026-11-06T07:00:00.000Z' },
          1,
          initial,
        );
        expect(moved.id).toBe(id);
        expect(moved.snapshot.price_irr).toBe(snapshot.price_irr);
        expect(moved.code).toBe(id);
      } finally {
        await app?.app.close();
        await oldPool.end();
        await upgrade.close();
        await rm(folder, { recursive: true, force: true });
      }
    },
  );
});
