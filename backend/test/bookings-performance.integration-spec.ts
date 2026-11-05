import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, arch } from 'node:os';
import { Pool } from 'pg';
import request from 'supertest';
import { it, expect } from 'vitest';
import { createTestDatabase } from './helpers/test-database.js';
import { runMigration } from './helpers/run-migration.js';
import { createTestApplication } from './helpers/create-test-application.js';
import { seedAvailability } from './helpers/availability-fixture.js';
import { BookingStore } from '../src/modules/bookings/application/booking-store.js';
import { DatabaseProvider } from '../src/database/database.provider.js';
import { vi } from 'vitest';
it('records bounded real queries and a 20-client local load with 10 salons, 5 staff and 10000 historical appointments', async () => {
  const target = await createTestDatabase();
  let pool: Pool | undefined,
    fixture: Awaited<ReturnType<typeof createTestApplication>> | undefined;
  try {
    const migration = await runMigration(target.url);
    expect(migration.status, migration.output).toBe(0);
    pool = new Pool({ connectionString: target.url });
    fixture = await createTestApplication('test', [], target.url, {
      now: () => new Date('2026-11-03T06:00:00Z'),
    });
    const fixtures: Awaited<ReturnType<typeof seedAvailability>>[] = [];
    for (let salon = 0; salon < 10; salon++) {
      const f = await seedAvailability(pool, '2026-11-03');
      fixtures.push(f);
      for (let i = 0; i < 2; i++) {
        const id = randomUUID();
        await pool.query(
          "INSERT INTO app.staff_profiles(id,business_id,display_name,public_visible) VALUES($1,$2,'متخصص آزمون بار',true)",
          [id, f.business],
        );
        await pool.query(
          'INSERT INTO app.staff_services(business_id,staff_id,service_id) VALUES($1,$2,$3)',
          [f.business, id, f.service],
        );
        await pool.query(
          'INSERT INTO app.staff_hours(business_id,staff_id,weekday,start_minute,end_minute) SELECT $1,$2,d,600,1200 FROM generate_series(0,6)d',
          [f.business, id],
        );
      }
      await pool.query('UPDATE app.staff_profiles SET public_visible=true WHERE business_id=$1', [
        f.business,
      ]);
      await pool.query('UPDATE app.business_hours SET end_minute=1200 WHERE business_id=$1', [
        f.business,
      ]);
      await pool.query('UPDATE app.staff_hours SET end_minute=1200 WHERE business_id=$1', [
        f.business,
      ]);
    }
    const db = pool,
      app = fixture.app;
    await app.listen(0, '127.0.0.1');
    const customer = randomUUID();
    await db.query('INSERT INTO app.users(id,email) VALUES($1,$2)', [
      customer,
      customer + '@example.com',
    ]);
    const snapshot = {
      business_name: 'سالن آزمون بار',
      business_address: 'نشانی آزمون',
      business_phone: '09123456789',
      service_name: 'کوتاهی آزمون',
      staff_name: 'متخصص آزمون',
      price_irr: 2500000,
      duration_minutes: 30,
      buffer_before_minutes: 10,
      buffer_after_minutes: 5,
      service_version: 1,
      customer_name: 'مراجعه آزمون بار',
      customer_mobile: '09123456789',
      timezone: 'Asia/Tehran',
      policy: 'هماهنگی با سالن',
    };
    const tx = await db.connect();
    try {
      await tx.query('BEGIN');
      for (const f of fixtures) {
        await tx.query(
          `WITH staff AS (SELECT id,row_number() over(ORDER BY id)-1 n FROM app.staff_profiles WHERE business_id=$1),
 seeds AS (SELECT gen_random_uuid() id,staff.id staff_id, '2025-01-01T07:00Z'::timestamptz+g*interval '1 hour' start FROM generate_series(0,999)g JOIN staff ON staff.n=g%5)
 INSERT INTO app.appointments(id,business_id,service_id,staff_id,booking_user_id,created_by,code,source,starts_at,ends_at,snapshot)
 SELECT id,$1,$2,staff_id,$3,$3,id::text,'online',start,start+interval '30 minutes',$4::jsonb FROM seeds`,
          [f.business, f.service, customer, JSON.stringify(snapshot)],
        );
      }
      await tx.query(
        `INSERT INTO app.schedule_allocations(appointment_id,business_id,staff_id,occupied_start,occupied_end) SELECT id,business_id,staff_id,starts_at-interval '10 minutes',ends_at+interval '5 minutes' FROM app.appointments`,
      );
      await tx.query(
        "INSERT INTO app.booking_events(appointment_id,version,actor_id,action) SELECT id,1,created_by,'created' FROM app.appointments",
      );
      await tx.query('COMMIT');
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
    const cookies: { user: string; cookie: string }[] = [];
    for (let i = 0; i < 20; i++) {
      const user = i === 0 ? customer : randomUUID();
      if (i)
        await db.query('INSERT INTO app.users(id,email) VALUES($1,$2)', [
          user,
          user + '@example.com',
        ]);
      const token = randomBytes(32).toString('base64url');
      await db.query(
        "INSERT INTO app.sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
        [user, createHash('sha256').update(token).digest('hex')],
      );
      cookies.push({ user, cookie: 'hair_salon_session=' + token });
    }
    const store = app.get(BookingStore),
      now = new Date('2026-11-03T06:00Z');
    // A busy day has two disjoint appointments for each of five staff, not physically impossible rows.
    for (const f of fixtures) {
      const staff = await db.query<{ id: string }>(
        'SELECT id FROM app.staff_profiles WHERE business_id=$1 ORDER BY id',
        [f.business],
      );
      for (const st of staff.rows)
        for (const clock of ['07:00', '08:00']) {
          const key = randomUUID();
          await store.create(
            { actor: f.owner, key, fingerprint: key, operation: 'manual' },
            {
              business_id: f.business,
              service_id: f.service,
              staff_id: st.id,
              starts_at: `2026-11-03T${clock}:00.000Z`,
              expected_price_irr: 2500000,
              expected_duration_minutes: 30,
              customer_name: 'مراجعه روز شلوغ',
              customer_mobile: null,
              notice_override_reason: null,
            },
            now,
          );
        }
    }
    const p95 = (values: number[]) =>
      values.toSorted((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1] ?? 0;
    async function batch(action: (i: number) => Promise<unknown>) {
      return Promise.all(
        Array.from({ length: 20 }, async (_, i) => {
          const start = performance.now();
          await action(i);
          return performance.now() - start;
        }),
      );
    }
    const reads = await batch(async (i) => {
      await request(app.getHttpServer())
        .get(
          i % 2
            ? `/api/v1/businesses/${fixtures[i % 10]!.business}/appointments?date=2026-11-03`
            : '/api/v1/me/appointments?period=past',
        )
        .set('Cookie', i % 2 ? await ownerCookie(fixtures[i % 10]!.owner) : cookies[0]!.cookie)
        .expect(200);
    });
    async function ownerCookie(owner: string) {
      const token = randomBytes(32).toString('base64url');
      await db.query(
        "INSERT INTO app.sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
        [owner, createHash('sha256').update(token).digest('hex')],
      );
      return 'hair_salon_session=' + token;
    }
    const availability = await batch(async (i) => {
      const f = fixtures[i % 10]!;
      await request(app.getHttpServer())
        .get(
          `/api/v1/catalog/salons/${f.business}/availability?service_id=${f.service}&from=2026-11-03&to=2026-11-03`,
        )
        .expect(200);
    });
    const creates = await batch(async (i) => {
      const f = fixtures[i % 10]!,
        key = randomUUID();
      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', cookies[i]!.cookie)
        .set('Idempotency-Key', key)
        .send({
          business_id: f.business,
          service_id: f.service,
          staff_id: 'any',
          starts_at: '2026-11-05T07:00:00.000Z',
          expected_price_irr: 2500000,
          expected_duration_minutes: 30,
          customer_name: 'مشتری بار',
          customer_mobile: '09123456789',
        })
        .expect(201);
    });
    const first = fixtures[0]!;
    const agendaPlan = await db.query(
      'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id,starts_at FROM app.appointments WHERE business_id=$1 AND starts_at>=$2 AND starts_at<$3 ORDER BY starts_at,id LIMIT 21',
      [first.business, '2026-11-03T00:00Z', '2026-11-04T00:00Z'],
    );
    const personalPlan = await db.query(
      'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id,starts_at FROM app.appointments WHERE booking_user_id=$1 AND ends_at<=$2 ORDER BY starts_at DESC,id DESC LIMIT 21',
      [customer, now],
    );
    const spy = vi.spyOn(app.get(DatabaseProvider).pool, 'query');
    await store.list(first.owner, { date: '2026-11-03', limit: 20 }, now, first.business);
    const agendaQueries = spy.mock.calls.length;
    spy.mockClear();
    await store.list(customer, { period: 'past', limit: 20 }, now);
    const personalQueries = spy.mock.calls.length;
    spy.mockRestore();
    expect(agendaQueries).toBe(2);
    expect(personalQueries).toBe(1);
    await mkdir('../work', { recursive: true });
    await writeFile(
      '../work/sprint-07-performance.json',
      JSON.stringify(
        {
          runtime: process.version,
          platform: platform() + ' ' + arch(),
          cpu: cpus()[0]?.model,
          logical_cpus: cpus().length,
          scope:
            'in-process HTTP + real local PostgreSQL; 20 concurrent clients per operation; not an internet production benchmark',
          salons: 10,
          staff_per_salon: 5,
          historical_appointments: 10000,
          busy_day_appointments_per_salon: 10,
          queries: { agenda: agendaQueries, personal: personalQueries },
          p95_ms: { read: p95(reads), availability: p95(availability), create: p95(creates) },
          samples_ms: { reads, availability, creates },
          agenda_plan: agendaPlan.rows,
          personal_plan: personalPlan.rows,
        },
        null,
        2,
      ),
    );
    expect(reads).toHaveLength(20);
    expect(creates).toHaveLength(20);
  } finally {
    await fixture?.app.close();
    await pool?.end();
    await target.close();
  }
}, 30000);
