import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { createTestDatabase } from './helpers/test-database.js';
import { createTestApplication } from './helpers/create-test-application.js';
import { runMigration } from './helpers/run-migration.js';
const origin = 'http://localhost:3000',
  password = 'test-only-strong-password';
const businessBody = { name: 'سالن خصوصی', audience: 'women', city: 'تهران' };
const serviceBody = {
  name: 'کوتاهی مو',
  price_irr: 2500000,
  duration_minutes: 45,
  buffer_before_minutes: 0,
  buffer_after_minutes: 10,
};
function cookie(response: request.Response): string {
  const value: unknown = response.headers['set-cookie'];
  if (!Array.isArray(value) || typeof value[0] !== 'string') throw new Error('Missing test cookie');
  return value[0].split(';')[0] ?? '';
}
describe('salon management with password sessions against PostgreSQL', () => {
  let target: Awaited<ReturnType<typeof createTestDatabase>>,
    fixture: Awaited<ReturnType<typeof createTestApplication>>,
    pool: Pool;
  beforeAll(async () => {
    target = await createTestDatabase();
    expect((await runMigration(target.url)).status).toBe(0);
    pool = new Pool({ connectionString: target.url, max: 5 });
    fixture = await createTestApplication('test', [], target.url);
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
  });
  afterAll(async () => {
    await fixture?.app.close();
    await pool?.end();
    await target?.close();
  });
  function get(path: string, session: string) {
    return request(fixture.app.getHttpServer())
      .get('/api/v1' + path)
      .set('Cookie', session);
  }
  function post(path: string, session: string, body: object, key = randomUUID()) {
    return request(fixture.app.getHttpServer())
      .post('/api/v1' + path)
      .set('Origin', origin)
      .set('Cookie', session)
      .set('Idempotency-Key', key)
      .send(body);
  }
  function change(
    method: 'patch' | 'put' | 'delete',
    path: string,
    session: string,
    body: object | undefined,
    version: number,
    key = randomUUID(),
  ) {
    const req = request(fixture.app.getHttpServer())
      [method]('/api/v1' + path)
      .set('Origin', origin)
      .set('Cookie', session)
      .set('Idempotency-Key', key)
      .set('If-Match', `"${version}"`);
    return body ? req.send(body) : req;
  }
  async function owner() {
    const email = `${randomUUID()}@example.com`;
    await post('/auth/register', '', { email, password }).expect(202);
    const logged = await post('/auth/login', '', { email, password }).expect(200);
    return {
      email,
      session: cookie(logged),
      userId: String(logged.body.data.user.id),
    };
  }
  async function salon(session: string, name = 'سالن خصوصی') {
    const r = await post('/businesses', session, {
      ...businessBody,
      name,
    }).expect(201);
    return String(r.body.data.id);
  }
  async function service(session: string, business: string) {
    const r = await post(`/businesses/${business}/services`, session, serviceBody).expect(201);
    return String(r.body.data.id);
  }
  it('allows password-only management, keeps email unverified and checks the server session', async () => {
    await get('/me/businesses', '').expect(401);
    await post('/businesses', '', businessBody).expect(401);
    const actor = await owner();
    const me = await get('/me', actor.session).expect(200);
    expect(me.body.data.user.email_verified).toBe(false);
    const id = await salon(actor.session);
    const listed = await get('/me/businesses', actor.session).expect(200);
    expect(listed.body.data.items.map((item: { id: string }) => item.id)).toEqual([id]);
    expect(listed.headers['cache-control']).toBe('no-store');
    const login = await post('/auth/login', '', { email: actor.email, password }).expect(200);
    const second = cookie(login);
    await get(`/businesses/${id}/settings`, second).expect(200);
    await pool.query(
      "UPDATE app.sessions SET expires_at=now()-interval '1 second',created_at=now()-interval '1 day' WHERE user_id=$1",
      [actor.userId],
    );
    await get('/me/businesses', actor.session).expect(401);
    await get(`/businesses/${id}/settings`, second).expect(401);
  });
  it('creates exactly one salon, membership, audit and result under concurrent replay', async () => {
    const actor = await owner(),
      key = randomUUID();
    const [a, b] = await Promise.all([
      post('/businesses', actor.session, businessBody, key),
      post('/businesses', actor.session, businessBody, key),
    ]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.data.id).toBe(b.body.data.id);
    for (const table of [
      'businesses',
      'business_memberships',
      'management_audit',
      'management_writes',
    ])
      expect((await pool.query(`SELECT count(*)::integer AS n FROM app.${table}`)).rows[0].n).toBe(
        1,
      );
    const reordered = await post(
      '/businesses',
      actor.session,
      {
        city: businessBody.city,
        audience: businessBody.audience,
        name: businessBody.name,
      },
      key,
    ).expect(201);
    expect(reordered.body.data.id).toBe(a.body.data.id);
    const mismatch = await post(
      '/businesses',
      actor.session,
      { ...businessBody, name: 'نام دیگر' },
      key,
    ).expect(409);
    expect(mismatch.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });
  it('rolls back the salon when ownership creation fails, without caching success', async () => {
    const actor = await owner();
    await pool.query(
      `CREATE FUNCTION app.fail_owner_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private-test-sentinel' USING ERRCODE='23514'; END $$; CREATE TRIGGER fail_owner_test BEFORE INSERT ON app.business_memberships FOR EACH ROW EXECUTE FUNCTION app.fail_owner_test()`,
    );
    try {
      const r = await post('/businesses', actor.session, businessBody).expect(422);
      expect(JSON.stringify(r.body)).not.toContain('private-test-sentinel');
      expect((await pool.query('SELECT id FROM app.businesses')).rowCount).toBe(0);
      expect((await pool.query('SELECT key FROM app.management_writes')).rowCount).toBe(0);
    } finally {
      await pool.query(
        'DROP TRIGGER fail_owner_test ON app.business_memberships; DROP FUNCTION app.fail_owner_test()',
      );
    }
  });
  it('isolates tenant reads, child writes, assignments, cursors and raw database foreign keys', async () => {
    const a = await owner(),
      b = await owner(),
      ba = await salon(a.session, 'سالن الف'),
      bb = await salon(b.session, 'سالن ب'),
      sa = await service(a.session, ba),
      sb = await service(b.session, bb);
    const staff = await post(`/businesses/${ba}/staff`, a.session, {
        display_name: 'متخصص الف',
        service_ids: [sa],
      }).expect(201),
      staffId = String(staff.body.data.id);
    const paths = [
      `/businesses/${bb}/settings`,
      `/businesses/${bb}/catalog/services`,
      `/businesses/${bb}/staff`,
      `/businesses/${bb}/hours`,
      `/businesses/${bb}/schedule-exceptions?from=2026-11-01&to=2026-11-30`,
    ];
    for (const path of paths) {
      const r = await get(path, a.session).expect(404);
      expect(JSON.stringify(r.body)).not.toContain('سالن ب');
    }
    await get(`/businesses/${ba}/catalog/services/${sb}`, a.session).expect(404);
    await change(
      'patch',
      `/businesses/${ba}/services/${sb}`,
      a.session,
      { name: 'دستکاری' },
      1,
    ).expect(404);
    await change(
      'patch',
      `/businesses/${ba}/staff/${staffId}`,
      a.session,
      { service_ids: [sb] },
      1,
    ).expect(422);
    await change(
      'put',
      `/businesses/${bb}/staff/${staffId}/hours`,
      a.session,
      { intervals: [] },
      1,
    ).expect(404);
    await expect(
      pool.query(
        'INSERT INTO app.staff_services(business_id,staff_id,service_id) VALUES($1,$2,$3)',
        [ba, staffId, sb],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    const page = await get(`/businesses/${ba}/catalog/services?limit=1`, a.session).expect(200);
    expect(page.body.data.items).toHaveLength(1);
    const foreignStaff = await post(`/businesses/${bb}/staff`, b.session, {
      display_name: 'متخصص ب',
      service_ids: [sb],
    }).expect(201);
    await get(`/businesses/${ba}/staff/${foreignStaff.body.data.id}`, a.session).expect(404);
    await get(`/businesses/${ba}/staff/${foreignStaff.body.data.id}/hours`, a.session).expect(404);
    const exception = await post(`/businesses/${bb}/schedule-exceptions`, b.session, {
      local_date: '2026-11-01',
      staff_id: null,
      closed: true,
      intervals: [],
    }).expect(201);
    await change(
      'patch',
      `/businesses/${ba}/schedule-exceptions/${exception.body.data.id}`,
      a.session,
      { closed: true, intervals: [] },
      1,
    ).expect(404);
    await change(
      'delete',
      `/businesses/${ba}/schedule-exceptions/${exception.body.data.id}`,
      a.session,
      undefined,
      1,
    ).expect(404);
    expect(
      (
        await get(
          `/businesses/${bb}/schedule-exceptions?from=2026-11-01&to=2026-11-30`,
          b.session,
        ).expect(200)
      ).body.data.items,
    ).toHaveLength(1);
    const own = await get('/me/businesses', a.session).expect(200);
    expect(own.body.data.items.map((x: { id: string }) => x.id)).toEqual([ba]);
  });
  it('rejects invalid money and mass assignment and allows only one concurrent versioned update', async () => {
    const actor = await owner(),
      business = await salon(actor.session),
      id = await service(actor.session, business),
      path = `/businesses/${business}/services/${id}`;
    for (const price of [-1, 1.5, 11, 10000000010])
      await post(`/businesses/${business}/services`, actor.session, {
        ...serviceBody,
        price_irr: price,
      }).expect(422);
    await post(`/businesses/${business}/services`, actor.session, {
      ...serviceBody,
      role: 'owner',
    }).expect(422);
    await request(fixture.app.getHttpServer())
      .patch('/api/v1' + path)
      .set('Origin', origin)
      .set('Cookie', actor.session)
      .set('Idempotency-Key', randomUUID())
      .send({ name: 'جدید' })
      .expect(428);
    const key = randomUUID();
    const results = await Promise.all([
      change('patch', path, actor.session, { name: 'نام الف' }, 1, key),
      change('patch', path, actor.session, { name: 'نام ب' }, 1),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const winner = results[0]?.status === 200 ? results[0] : results[1];
    expect(winner?.body.data.version).toBe(2);
    if (results[0]?.status === 200) {
      const replay = await change('patch', path, actor.session, { name: 'نام الف' }, 1, key).expect(
        200,
      );
      expect(replay.body.data.version).toBe(2);
    }
  });
  it('retains archived service assignments without creating staff credentials', async () => {
    const actor = await owner(),
      business = await salon(actor.session),
      id = await service(actor.session, business);
    const staff = await post(`/businesses/${business}/staff`, actor.session, {
      display_name: 'همکار سالن',
      service_ids: [id],
    }).expect(201);
    await change(
      'patch',
      `/businesses/${business}/services/${id}`,
      actor.session,
      { active: false },
      1,
    ).expect(200);
    const updated = await change(
      'patch',
      `/businesses/${business}/staff/${staff.body.data.id}`,
      actor.session,
      { display_name: 'نام تازه' },
      1,
    ).expect(200);
    expect(updated.body.data.service_ids).toEqual([id]);
    await post(`/businesses/${business}/staff`, actor.session, {
      display_name: 'همکار دیگر',
      service_ids: [id],
    }).expect(422);
    expect((await pool.query('SELECT count(*)::integer AS n FROM app.users')).rows[0].n).toBe(1);
  });
  it('replaces weekly hours atomically, versions them and enforces overlap even outside HTTP', async () => {
    const actor = await owner(),
      business = await salon(actor.session),
      path = `/businesses/${business}/hours`;
    const body = {
      intervals: [
        { weekday: 0, start_local: '09:00', end_local: '12:00' },
        { weekday: 0, start_local: '12:00', end_local: '24:00' },
      ],
    };
    const first = await change('put', path, actor.session, body, 1).expect(200);
    expect(first.headers.etag).toBe('"2"');
    await change(
      'put',
      path,
      actor.session,
      { intervals: [{ weekday: 0, start_local: '23:00', end_local: '01:00' }] },
      2,
    ).expect(422);
    expect((await get(path, actor.session)).body.data).toEqual(first.body.data);
    await change('put', path, actor.session, { intervals: [] }, 1).expect(409);
    await expect(
      pool.query(
        'INSERT INTO app.business_hours(business_id,weekday,start_minute,end_minute) VALUES($1,0,600,780)',
        [business],
      ),
    ).rejects.toMatchObject({ code: '23P01' });
  });
  it('protects nullable-scope exceptions, deferred interval integrity and idempotent removal', async () => {
    const actor = await owner(),
      business = await salon(actor.session),
      path = `/businesses/${business}/schedule-exceptions`,
      body = {
        local_date: '2026-11-01',
        staff_id: null,
        closed: true,
        intervals: [],
      };
    const first = await post(path, actor.session, body).expect(201);
    await post(path, actor.session, body).expect(409);
    await post(path, actor.session, {
      ...body,
      local_date: '2026-11-02',
      closed: false,
    }).expect(422);
    const key = randomUUID(),
      removePath = path + '/' + first.body.data.id;
    await change('delete', removePath, actor.session, undefined, 1, key).expect(200);
    const replay = await change('delete', removePath, actor.session, undefined, 1, key).expect(200);
    expect(replay.body.data.deleted).toBe(true);
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      await tx.query(
        "INSERT INTO app.schedule_exceptions(business_id,local_date,closed) VALUES($1,'2026-11-03',false)",
        [business],
      );
      await expect(tx.query('COMMIT')).rejects.toMatchObject({ code: '23514' });
    } finally {
      await tx.query('ROLLBACK');
      tx.release();
    }
  });
  it('binds pagination to tenant/filter and rechecks ownership before idempotent replay', async () => {
    const actor = await owner(),
      first = await salon(actor.session, 'سالن الف'),
      second = await salon(actor.session, 'سالن دوم');
    const ids = [
      await service(actor.session, first),
      await service(actor.session, first),
      await service(actor.session, first),
    ];
    const path = `/businesses/${first}/catalog/services`,
      p = await get(path + '?limit=1', actor.session).expect(200);
    const cursor: unknown = p.body.data.next_cursor;
    if (typeof cursor !== 'string') throw new Error('Expected cursor');
    const next = await get(
      path + '?limit=2&cursor=' + encodeURIComponent(cursor),
      actor.session,
    ).expect(200);
    expect(
      new Set([...p.body.data.items, ...next.body.data.items].map((x: { id: string }) => x.id)),
    ).toEqual(new Set(ids));
    await get(
      `/businesses/${second}/catalog/services?cursor=${encodeURIComponent(cursor)}`,
      actor.session,
    ).expect(422);
    await get(path + '?active=true&cursor=' + encodeURIComponent(cursor), actor.session).expect(
      422,
    );
    const key = randomUUID();
    await post(`/businesses/${first}/services`, actor.session, serviceBody, key).expect(201);
    await pool.query(
      "UPDATE app.management_writes SET cache_expires_at=now()-interval '1 second' WHERE key=$1",
      [key],
    );
    const expired = await post(
      `/businesses/${first}/services`,
      actor.session,
      serviceBody,
      key,
    ).expect(409);
    expect(expired.body.error.code).toBe('IDEMPOTENCY_RESULT_EXPIRED');
    await pool.query('UPDATE app.business_memberships SET active=false WHERE business_id=$1', [
      first,
    ]);
    await post(`/businesses/${first}/services`, actor.session, serviceBody, key).expect(404);
    expect(
      (
        await pool.query('SELECT count(*)::int AS n FROM app.services WHERE business_id=$1', [
          first,
        ])
      ).rows[0].n,
    ).toBe(4);
  });
  it('enforces the salon cap under simultaneous creates with distinct keys', async () => {
    const actor = await owner();
    await salon(actor.session, 'سالن اول');
    await salon(actor.session, 'سالن دوم');
    const results = await Promise.all([
      post('/businesses', actor.session, businessBody),
      post('/businesses', actor.session, businessBody),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS n FROM app.business_memberships WHERE user_id=$1',
          [actor.userId],
        )
      ).rows[0].n,
    ).toBe(3);
  });
  it('retains management write limits with Retry-After after removing MFA', async () => {
    const actor = await owner();
    for (let attempt = 0; attempt < 5; attempt++) {
      await post('/businesses', actor.session, businessBody).expect(attempt < 3 ? 201 : 409);
    }
    const blocked = await post('/businesses', actor.session, businessBody).expect(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });
  it('rejects cross-origin mutation, returns private errors and never publishes drafts', async () => {
    const actor = await owner(),
      business = await salon(actor.session);
    const response = await request(fixture.app.getHttpServer())
      .post(`/api/v1/businesses/${business}/services`)
      .set('Cookie', actor.session)
      .set('Origin', 'http://untrusted.invalid')
      .send(serviceBody)
      .expect(403);
    expect(response.headers['cache-control']).toBe('no-store');
    await request(fixture.app.getHttpServer()).get(`/api/v1/businesses/${business}`).expect(404);
    await request(fixture.app.getHttpServer())
      .get(`/api/v1/businesses/${business}/services`)
      .expect(404);
    await post('/auth/logout', actor.session, {}).expect(200);
    await get('/me/businesses', actor.session).expect(401);
  });
});
