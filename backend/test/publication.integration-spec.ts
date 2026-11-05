import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { createTestDatabase } from './helpers/test-database.js';
import { createTestApplication } from './helpers/create-test-application.js';
import { runMigration } from './helpers/run-migration.js';
import { publicSalonsSql } from '../src/modules/salon-management/infrastructure/persistence/postgres-public-catalog-store.js';
import { normalizePersian } from '../src/modules/salon-management/domain/publication-policy.js';
const origin = 'http://localhost:3000',
  password = 'test-only-strong-password';
const serviceBody = {
  name: 'کوتاهی مو',
  category_id: 'haircut',
  price_irr: 2500000,
  duration_minutes: 45,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
};
const intervals = [{ weekday: 0, start_local: '09:00', end_local: '18:00' }];
describe('owner publication and legacy moderation against real PostgreSQL', () => {
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
    if (target)
      await vi.waitFor(
        async () =>
          expect(
            (
              await target.admin.query(
                'SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1',
                [target.name],
              )
            ).rows[0].n,
          ).toBe(0),
        { timeout: 5000 },
      );
    await target?.close();
  });
  const get = (path: string, session = '') =>
    request(fixture.app.getHttpServer())
      .get('/api/v1' + path)
      .set('Cookie', session);
  function write(
    path: string,
    session: string,
    body: object,
    version?: number,
    key = randomUUID(),
    method: 'post' | 'patch' | 'put' = 'post',
  ) {
    const r = request(fixture.app.getHttpServer())
      [method]('/api/v1' + path)
      .set('Cookie', session)
      .set('Origin', origin)
      .set('Idempotency-Key', key);
    if (version !== undefined) r.set('If-Match', `"${version}"`);
    return r.send(body);
  }
  async function actor() {
    const email = randomUUID() + '@example.com';
    await write('/auth/register', '', { email, password }).expect(202);
    const r = await write('/auth/login', '', { email, password }).expect(200);
    const raw: unknown = r.headers['set-cookie'];
    if (!Array.isArray(raw) || typeof raw[0] !== 'string') throw new Error('Missing session');
    return { session: raw[0].split(';')[0] ?? '', id: String(r.body.data.user.id) };
  }
  async function reviewer() {
    const a = await actor();
    await pool.query('INSERT INTO app.reviewer_permissions(user_id,active) VALUES($1,true)', [
      a.id,
    ]);
    return a;
  }
  async function ready(session: string, name = 'سالن نیلوفر', price = 2500000) {
    const b = await write('/businesses', session, {
      name,
      audience: 'women',
      city: 'كاشان',
      district: 'محله ياس',
      public_address: 'آدرس عمومی واقعی',
      public_phone: '09121234567',
      description: 'معرفی واقعی سالن',
    }).expect(201);
    const id = String(b.body.data.id);
    const service = await write(`/businesses/${id}/services`, session, {
      ...serviceBody,
      price_irr: price,
    }).expect(201);
    const sid = String(service.body.data.id);
    const staff = await write(`/businesses/${id}/staff`, session, {
      display_name: 'متخصص عمومی',
      service_ids: [sid],
      public_visible: true,
    }).expect(201);
    const staffId = String(staff.body.data.id);
    await write(`/businesses/${id}/hours`, session, { intervals }, 1, randomUUID(), 'put').expect(
      200,
    );
    await write(
      `/businesses/${id}/staff/${staffId}/hours`,
      session,
      { intervals },
      1,
      randomUUID(),
      'put',
    ).expect(200);
    return { id, sid, staffId };
  }
  async function status(id: string, session: string) {
    return (await get(`/businesses/${id}/publication`, session).expect(200)).body.data;
  }
  async function publish(id: string, session: string, key = randomUUID()) {
    const p = await status(id, session);
    return (
      await write(
        `/businesses/${id}/publication/requests`,
        session,
        { consent: true },
        Number(p.version),
        key,
      ).expect(200)
    ).body.data;
  }
  // Upgrade fixture only: reproduce an already persisted v1 request, without routing new writes through the retired workflow.
  async function legacyRequest(id: string, session: string) {
    const user = (await get('/me', session).expect(200)).body.data.user.id;
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      const p = (
        await tx.query(
          'SELECT content_revision,publication_version FROM app.businesses WHERE id=$1 FOR UPDATE',
          [id],
        )
      ).rows[0];
      const event = randomUUID();
      await tx.query(
        "INSERT INTO app.publication_events(id,business_id,actor_id,action,revision,publication_version,request_id,consent) VALUES($1,$2,$3,'request',$4,$5,$1,true)",
        [event, id, user, p.content_revision, p.publication_version + 1],
      );
      await tx.query(
        "UPDATE app.businesses SET state='pending_review',current_request_id=$2,version=version+1,publication_version=publication_version+1 WHERE id=$1",
        [id, event],
      );
      await tx.query('COMMIT');
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
    return status(id, session);
  }
  async function approve(id: string, owner: string, review: string) {
    const p = await legacyRequest(id, owner);
    return (
      await write(
        `/review/businesses/${id}/decisions`,
        review,
        { decision: 'approve', request_id: p.request_id, content_revision: p.content_revision },
        Number(p.version),
      ).expect(200)
    ).body.data;
  }
  it('publishes immediately without a reviewer and replays exactly one consented publication', async () => {
    const owner = await actor(),
      other = await actor(),
      b = await ready(owner.session);
    const before = await status(b.id, owner.session),
      key = randomUUID();
    await write(
      `/businesses/${b.id}/publication/requests`,
      other.session,
      { consent: true },
      Number(before.version),
    ).expect(404);
    await write(
      `/businesses/${b.id}/publication/requests`,
      owner.session,
      { consent: false },
      Number(before.version),
    ).expect(422);
    const published = await publish(b.id, owner.session, key);
    expect(published.state).toBe('published');
    expect(published.history[0]).toMatchObject({
      action: 'publish',
      request_id: published.request_id,
    });
    expect(
      (await pool.query('SELECT count(*)::int n FROM app.reviewer_permissions WHERE active'))
        .rows[0].n,
    ).toBe(0);
    await get(`/catalog/salons/${b.id}`).expect(200);
    await write(
      `/businesses/${b.id}/publication/requests`,
      owner.session,
      { consent: true },
      Number(before.version),
      key,
    ).expect(200);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM app.publication_events WHERE business_id=$1 AND action='publish'",
          [b.id],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it('lets the owner finish an existing pending request without waiting for a reviewer', async () => {
    const owner = await actor(),
      b = await ready(owner.session);
    await legacyRequest(b.id, owner.session);
    await get(`/catalog/salons/${b.id}`).expect(404);
    expect((await publish(b.id, owner.session)).state).toBe('published');
    await get(`/catalog/salons/${b.id}`).expect(200);
  });
  it('keeps valid edits public, returns final settings state and requires consent again after incomplete edits', async () => {
    const owner = await actor(),
      b = await ready(owner.session);
    await publish(b.id, owner.session);
    await write(
      `/businesses/${b.id}/services/${b.sid}`,
      owner.session,
      { price_irr: 3100000 },
      1,
      randomUUID(),
      'patch',
    ).expect(200);
    await write(
      `/businesses/${b.id}/hours`,
      owner.session,
      { intervals: [{ weekday: 0, start_local: '10:00', end_local: '17:00' }] },
      2,
      randomUUID(),
      'put',
    ).expect(200);
    expect((await get(`/catalog/salons/${b.id}`).expect(200)).body.data.services[0].price_irr).toBe(
      3100000,
    );
    const settings = (await get(`/businesses/${b.id}/settings`, owner.session)).body.data;
    const incomplete = await write(
      `/businesses/${b.id}/settings`,
      owner.session,
      { public_phone: null },
      settings.version,
      randomUUID(),
      'patch',
    ).expect(200);
    expect(incomplete.body.data.state).toBe('draft');
    await get(`/catalog/salons/${b.id}`).expect(404);
    await write(
      `/businesses/${b.id}/publication/requests`,
      owner.session,
      { consent: true },
      Number((await status(b.id, owner.session)).version),
    ).expect(422);
    await write(
      `/businesses/${b.id}/settings`,
      owner.session,
      { public_phone: '09121234567' },
      incomplete.body.data.version,
      randomUUID(),
      'patch',
    ).expect(200);
    expect((await status(b.id, owner.session)).state).toBe('draft');
    expect((await publish(b.id, owner.session)).state).toBe('published');
  });
  it('serializes two owner publications and a withdrawal without duplicate publication events', async () => {
    const owner = await actor(),
      b = await ready(owner.session),
      p = await status(b.id, owner.session);
    const results = await Promise.all(
      [1, 2].map(() =>
        write(
          `/businesses/${b.id}/publication/requests`,
          owner.session,
          { consent: true },
          Number(p.version),
        ),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const current = await status(b.id, owner.session);
    await write(
      `/businesses/${b.id}/publication/withdrawals`,
      owner.session,
      {},
      Number(current.version),
    ).expect(200);
    await get(`/catalog/salons/${b.id}`).expect(404);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM app.publication_events WHERE business_id=$1 AND action='publish'",
          [b.id],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it('keeps empty discovery honest and strictly bounds public filters', async () => {
    expect((await get('/catalog/salons').expect(200)).body.data).toEqual({
      items: [],
      next_cursor: null,
    });
    expect((await get('/catalog/locations').expect(200)).body.data.items).toEqual([]);
    expect((await get('/catalog/categories').expect(200)).body.data.items).toHaveLength(7);
    for (const q of [
      'q=a&q=b',
      'city=a&city=b',
      'limit=51',
      'district=یاس',
      'unknown=x',
      'category=unknown',
      'cursor=invalid',
      'q=' + encodeURIComponent('x'.repeat(101)),
    ])
      await get('/catalog/salons?' + q).expect(422);
    const r = await get('/catalog/salons');
    expect(r.headers['cache-control']).toBe('no-store');
  });
  it('enforces current owner/reviewer rights, no self-review and no email verification gate', async () => {
    const owner = await actor(),
      review = await reviewer(),
      other = await actor();
    const b = await ready(owner.session);
    expect((await get('/me', owner.session)).body.data.user.email_verified).toBe(false);
    await get(`/businesses/${b.id}/preview`).expect(401);
    await get(`/businesses/${b.id}/preview`, other.session).expect(404);
    await get(`/review/businesses/${b.id}`, owner.session).expect(403);
    await get(`/review/businesses/${b.id}`, review.session).expect(404);
    expect((await get('/review/businesses', review.session)).body.data.items).toEqual([]);
    await write(
      `/businesses/${b.id}/publication/requests`,
      owner.session,
      { consent: false },
      Number((await status(b.id, owner.session)).version),
    ).expect(422);
    const p = await legacyRequest(b.id, owner.session);
    await pool.query('INSERT INTO app.reviewer_permissions(user_id,active) VALUES($1,true)', [
      owner.id,
    ]);
    await write(
      `/review/businesses/${b.id}/decisions`,
      owner.session,
      { decision: 'approve', request_id: p.request_id, content_revision: p.content_revision },
      Number(p.version),
    ).expect(403);
    await write(
      `/businesses/${b.id}/settings`,
      review.session,
      { name: 'دسترسی نامجاز' },
      1,
      randomUUID(),
      'patch',
    ).expect(404);
    await write(
      `/review/businesses/${b.id}/decisions`,
      review.session,
      { decision: 'approve', request_id: p.request_id, content_revision: p.content_revision },
      Number(p.version),
    ).expect(200);
    await get(`/catalog/salons/${b.id}`).expect(200);
  });
  it('returns precise readiness issues and keeps legacy categories and hidden staff private', async () => {
    const owner = await actor();
    const b = await ready(owner.session);
    await pool.query('UPDATE app.services SET category_id=NULL WHERE id=$1', [b.sid]);
    await pool.query('UPDATE app.staff_profiles SET public_visible=false WHERE id=$1', [b.staffId]);
    const p = await status(b.id, owner.session);
    expect(p.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CATEGORY_REQUIRED',
          resource_id: b.sid,
          section: 'services',
        }),
        expect.objectContaining({ code: 'PUBLIC_STAFF_REQUIRED', resource_id: b.sid }),
      ]),
    );
    const preview = await get(`/businesses/${b.id}/preview`, owner.session).expect(200);
    expect(preview.body.data.staff).toEqual([]);
    await write(
      `/businesses/${b.id}/services/${b.sid}`,
      owner.session,
      { active: false },
      1,
      randomUUID(),
      'patch',
    ).expect(200);
    expect(
      (await pool.query('SELECT category_id FROM app.services WHERE id=$1', [b.sid])).rows[0]
        .category_id,
    ).toBeNull();
    await get(`/catalog/salons/${b.id}`).expect(404);
  });
  it('checks service buffers against real shared hours and rejects a mismatched reviewed revision', async () => {
    const owner = await actor(),
      review = await reviewer(),
      b = await ready(owner.session);
    await pool.query('UPDATE app.staff_hours SET end_minute=start_minute+45 WHERE staff_id=$1', [
      b.staffId,
    ]);
    await pool.query('UPDATE app.services SET buffer_after_minutes=1 WHERE id=$1', [b.sid]);
    const unready = await status(b.id, owner.session);
    expect(unready.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'HOURS_INTERSECTION_REQUIRED', resource_id: b.sid }),
      ]),
    );
    await write(
      `/businesses/${b.id}/publication/requests`,
      owner.session,
      { consent: true },
      Number(unready.version),
    ).expect(422);
    await pool.query('UPDATE app.staff_hours SET end_minute=start_minute+46 WHERE staff_id=$1', [
      b.staffId,
    ]);
    const p = await legacyRequest(b.id, owner.session);
    await write(
      `/review/businesses/${b.id}/decisions`,
      review.session,
      {
        decision: 'approve',
        request_id: p.request_id,
        content_revision: p.content_revision - 1,
      },
      Number(p.version),
    ).expect(409);
    await write(
      `/review/businesses/${b.id}/decisions`,
      review.session,
      {
        decision: 'approve',
        request_id: p.request_id,
      },
      Number(p.version),
    ).expect(422);
    await write(
      `/review/businesses/${b.id}/decisions`,
      review.session,
      {
        decision: 'approve',
        request_id: p.request_id,
        content_revision: p.content_revision,
      },
      Number(p.version),
    ).expect(200);
  });
  it('orders publication history by causal version even when transaction timestamps disagree', async () => {
    const owner = await actor(),
      review = await reviewer(),
      b = await ready(owner.session);
    const p = await legacyRequest(b.id, owner.session);
    // now() records transaction start, so a later lock holder may have an earlier timestamp.
    await pool.query(
      "UPDATE app.publication_events SET created_at=now()+interval '1 hour' WHERE id=$1",
      [p.request_id],
    );
    await write(
      `/review/businesses/${b.id}/decisions`,
      review.session,
      {
        decision: 'approve',
        request_id: p.request_id,
        content_revision: p.content_revision,
      },
      Number(p.version),
    ).expect(200);
    await write(
      `/businesses/${b.id}/services/${b.sid}`,
      owner.session,
      { price_irr: 3000000 },
      1,
      randomUUID(),
      'patch',
    ).expect(200);
    expect(
      (await status(b.id, owner.session)).history.map((event: { action: string }) => event.action),
    ).toEqual(['content_updated', 'approve', 'request']);
  });
  it('publishes only allowlisted real fields and withdraws atomically without altering content revision', async () => {
    const owner = await actor(),
      review = await reviewer();
    const b = await ready(owner.session, 'سالن واقعی', 0);
    await write(`/businesses/${b.id}/staff`, owner.session, {
      display_name: 'نام خصوصی',
      service_ids: [b.sid],
    }).expect(201);
    const before = await status(b.id, owner.session);
    const published = await approve(b.id, owner.session, review.session);
    expect(published.content_revision).toBe(before.content_revision);
    const publicData = (await get(`/catalog/salons/${b.id}`).expect(200)).body.data;
    expect(Object.keys(publicData).sort()).toEqual(
      [
        'id',
        'name',
        'description',
        'audience',
        'city',
        'district',
        'public_address',
        'public_phone',
        'timezone',
        'services',
        'staff',
        'hours',
        'exceptions',
      ].sort(),
    );
    expect(JSON.stringify(publicData)).not.toMatch(
      /نام خصوصی|email|membership|password|session|reason|revision|audit/,
    );
    expect(Object.keys(publicData.services[0]).sort()).toEqual(
      ['id', 'name', 'category_id', 'price_irr', 'duration_minutes'].sort(),
    );
    expect((await get('/catalog/salons')).body.data.items[0].min_price_irr).toBe(0);
    const settings = await get(`/businesses/${b.id}/settings`, owner.session);
    expect(settings.body.data.state).toBe('published');
    expect(settings.headers.etag).toBe(`"${settings.body.data.version}"`);
    await write(
      `/businesses/${b.id}/publication/withdrawals`,
      owner.session,
      {},
      Number(published.version),
    ).expect(200);
    await get(`/catalog/salons/${b.id}`).expect(404);
    expect((await get('/catalog/locations')).body.data.items).toEqual([]);
  });
  it.each(
    ['owner', 'legacy'].flatMap((mode) =>
      (['service', 'staff', 'business', 'hours', 'exception'] as const).map((kind) => ({
        mode,
        kind,
      })),
    ),
  )('serializes $mode publication against a simultaneous $kind edit', async ({ mode, kind }) => {
    const owner = await actor(),
      review = await reviewer(),
      b = await ready(owner.session);
    const p =
      mode === 'owner'
        ? await status(b.id, owner.session)
        : await legacyRequest(b.id, owner.session);
    const settings = (await get(`/businesses/${b.id}/settings`, owner.session)).body.data;
    const paths = {
      service: `/businesses/${b.id}/services/${b.sid}`,
      staff: `/businesses/${b.id}/staff/${b.staffId}`,
      business: `/businesses/${b.id}/settings`,
      hours: `/businesses/${b.id}/hours`,
      exception: `/businesses/${b.id}/schedule-exceptions`,
    };
    const bodies = {
      service: { price_irr: 3500000 },
      staff: { public_visible: false },
      business: { name: 'نام جدید بررسی‌نشده' },
      hours: { intervals: [] },
      exception: { local_date: '2026-12-02', staff_id: null, closed: true, intervals: [] },
    };
    const version =
      kind === 'business'
        ? Number(settings.version)
        : kind === 'hours'
          ? 2
          : kind === 'exception'
            ? undefined
            : 1;
    const [decision, edit] = await Promise.all([
      mode === 'owner'
        ? write(
            `/businesses/${b.id}/publication/requests`,
            owner.session,
            { consent: true },
            Number(p.version),
          )
        : write(
            `/review/businesses/${b.id}/decisions`,
            review.session,
            { decision: 'approve', request_id: p.request_id, content_revision: p.content_revision },
            Number(p.version),
          ),
      write(
        paths[kind],
        owner.session,
        bodies[kind],
        version,
        randomUUID(),
        kind === 'hours' ? 'put' : kind === 'exception' ? 'post' : 'patch',
      ),
    ]);
    expect([200, 409]).toContain(decision.status);
    if (kind === 'business' && edit.status === 409) {
      expect(decision.status).toBe(200);
      expect((await get(`/catalog/salons/${b.id}`).expect(200)).body.data.name).toBe('سالن نیلوفر');
    } else {
      expect(edit.status).toBe(200 + (kind === 'exception' ? 1 : 0));
      const staysPublic = decision.status === 200 && !['staff', 'hours'].includes(kind);
      expect((await status(b.id, owner.session)).state).toBe(staysPublic ? 'published' : 'draft');
      await get(`/catalog/salons/${b.id}`).expect(staysPublic ? 200 : 404);
    }
  });
  it('allows one competing decision, binds exact request and denies replay after permission revocation', async () => {
    const owner = await actor(),
      review = await reviewer(),
      b = await ready(owner.session),
      p = await legacyRequest(b.id, owner.session),
      key = randomUUID();
    const body = {
      decision: 'approve',
      request_id: p.request_id,
      content_revision: p.content_revision,
    };
    const results = await Promise.all([
      write(`/review/businesses/${b.id}/decisions`, review.session, body, Number(p.version), key),
      write(
        `/review/businesses/${b.id}/decisions`,
        review.session,
        {
          decision: 'reject',
          request_id: p.request_id,
          content_revision: p.content_revision,
          reason: 'اصلاح اطلاعات',
        },
        Number(p.version),
      ),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    if (results[0]?.status === 200) {
      await write(
        `/review/businesses/${b.id}/decisions`,
        review.session,
        body,
        Number(p.version),
        key,
      ).expect(200);
      const n = await pool.query(
        "SELECT count(*)::int AS n FROM app.publication_events WHERE business_id=$1 AND action='approve'",
        [b.id],
      );
      expect(n.rows[0].n).toBe(1);
    }
    await pool.query('UPDATE app.reviewer_permissions SET active=false WHERE user_id=$1', [
      review.id,
    ]);
    await write(
      `/review/businesses/${b.id}/decisions`,
      review.session,
      body,
      Number(p.version),
      key,
    ).expect(403);
    await get(`/review/businesses/${b.id}`, review.session).expect(403);
  });
  it('rolls back failed edits and valid replay never invalidates a newer publication', async () => {
    const owner = await actor(),
      review = await reviewer(),
      b = await ready(owner.session),
      key = randomUUID();
    const body = { price_irr: 10000000000 };
    await write(
      `/businesses/${b.id}/services/${b.sid}`,
      owner.session,
      body,
      1,
      key,
      'patch',
    ).expect(200);
    const pub = await approve(b.id, owner.session, review.session);
    await write(
      `/businesses/${b.id}/services/${b.sid}`,
      owner.session,
      body,
      1,
      key,
      'patch',
    ).expect(200);
    expect(await status(b.id, owner.session)).toMatchObject({
      state: 'published',
      version: pub.version,
      content_revision: pub.content_revision,
    });
    await write(
      `/businesses/${b.id}/services/${b.sid}`,
      owner.session,
      { category_id: 'not-a-category' },
      2,
      randomUUID(),
      'patch',
    ).expect(422);
    await write(
      `/businesses/${b.id}/services/${b.sid}`,
      owner.session,
      { price_irr: 10 },
      1,
      randomUUID(),
      'patch',
    ).expect(409);
    expect((await status(b.id, owner.session)).version).toBe(pub.version);
    expect((await get('/catalog/salons')).body.data.items[0].min_price_irr).toBe(10000000000);
    const q = await pool.query(
      "SELECT count(*)::int AS n FROM app.publication_events WHERE business_id=$1 AND action='content_changed'",
      [b.id],
    );
    expect(q.rows[0].n).toBe(0);
  });
  it('rejects stale requests, keeps suspension private, records reasons and requires correction', async () => {
    const owner = await actor(),
      review = await reviewer(),
      b = await ready(owner.session);
    let p = await legacyRequest(b.id, owner.session);
    await write(
      `/businesses/${b.id}/services/${b.sid}`,
      owner.session,
      { name: 'کوتاهی تازه' },
      1,
      randomUUID(),
      'patch',
    ).expect(200);
    await write(
      `/review/businesses/${b.id}/decisions`,
      review.session,
      { decision: 'approve', request_id: p.request_id, content_revision: p.content_revision },
      Number(p.version),
    ).expect(409);
    p = await legacyRequest(b.id, owner.session);
    await write(
      `/review/businesses/${b.id}/decisions`,
      review.session,
      {
        decision: 'reject',
        request_id: p.request_id,
        content_revision: p.content_revision,
        reason: 'نشانی را دقیق‌تر کنید',
      },
      Number(p.version),
    ).expect(200);
    expect((await status(b.id, owner.session)).history[0].reason).toBe('نشانی را دقیق‌تر کنید');
    p = await approve(b.id, owner.session, review.session);
    p = (
      await write(
        `/review/businesses/${b.id}/decisions`,
        review.session,
        {
          decision: 'suspend',
          request_id: p.request_id,
          content_revision: p.content_revision,
          reason: 'درخواست اصلاح',
        },
        Number(p.version),
      ).expect(200)
    ).body.data;
    await get(`/catalog/salons/${b.id}`).expect(404);
    await write(
      `/businesses/${b.id}/publication/requests`,
      owner.session,
      { consent: true },
      Number(p.version),
    ).expect(409);
    await write(
      `/businesses/${b.id}/services/${b.sid}`,
      owner.session,
      { name: 'کوتاهی اصلاح‌شده' },
      2,
      randomUUID(),
      'patch',
    ).expect(200);
    expect((await status(b.id, owner.session)).state).toBe('suspended');
    await write(
      `/businesses/${b.id}/publication/requests`,
      owner.session,
      { consent: true },
      Number((await status(b.id, owner.session)).version),
    ).expect(409);
    const suspended = await status(b.id, owner.session);
    await write(
      `/review/businesses/${b.id}/decisions`,
      review.session,
      { decision: 'approve', request_id: null, content_revision: suspended.content_revision },
      Number(suspended.version),
    ).expect(200);
    await get(`/catalog/salons/${b.id}`).expect(200);
  });
  it('uses normalized filters, matched prices and precise scoped pagination without duplicate salons', async () => {
    const owner = await actor(),
      review = await reviewer();
    const ids: string[] = [];
    for (const name of ['سالن ياس', 'سالن یاس دوم', 'سالن یاس سوم']) {
      const b = await ready(owner.session, name);
      await write(`/businesses/${b.id}/services`, owner.session, {
        ...serviceBody,
        name: 'اصلاح ریش',
        category_id: 'beard',
        price_irr: 100000,
      }).expect(201);
      await pool.query(
        'INSERT INTO app.staff_services(business_id,staff_id,service_id) SELECT business_id,$2,id FROM app.services WHERE business_id=$1 ON CONFLICT DO NOTHING',
        [b.id, b.staffId],
      );
      await approve(b.id, owner.session, review.session);
      ids.push(b.id);
    }
    for (const [i, id] of ids.entries())
      await pool.query(
        "UPDATE app.businesses SET created_at='2026-11-02 10:00:00+00'::timestamptz + $2::int * interval '1 microsecond' WHERE id=$1",
        [id, i + 1],
      );
    // Every public service needs a visible assigned specialist.
    const all = await get(
      '/catalog/salons?city=' +
        encodeURIComponent('کاشان') +
        '&q=' +
        encodeURIComponent('ياس') +
        '&limit=1',
    ).expect(200);
    const first = all.body.data;
    expect(first.items).toHaveLength(1);
    expect(first.next_cursor).toBeTruthy();
    const next = await get(
      '/catalog/salons?city=' +
        encodeURIComponent('کاشان') +
        '&q=' +
        encodeURIComponent('ياس') +
        '&limit=1&cursor=' +
        first.next_cursor,
    ).expect(200);
    expect(next.body.data.items[0].id).not.toBe(first.items[0].id);
    await get('/catalog/salons?cursor=' + first.next_cursor).expect(422);
    const beard = await get('/catalog/salons?category=beard').expect(200);
    expect(beard.body.data.items).toHaveLength(3);
    expect(
      beard.body.data.items.every((s: { min_price_irr: number }) => s.min_price_irr === 100000),
    ).toBe(true);
    const combined = await get(
      '/catalog/salons?category=beard&q=' + encodeURIComponent('کوتاهی'),
    ).expect(200);
    expect(combined.body.data.items).toHaveLength(3);
    expect(
      combined.body.data.items.every((s: { min_price_irr: number }) => s.min_price_irr === 100000),
    ).toBe(true);
    expect(
      (await get('/catalog/salons?q=' + encodeURIComponent('کاشان')).expect(200)).body.data.items,
    ).toEqual([]);
    for (const input of ['  كـوتاهي‌ موِ ', 'نيلوفر', 'ياس', 'É'])
      expect(
        (await pool.query('SELECT app.normalize_search($1) AS value', [input])).rows[0].value,
      ).toBe(normalizePersian(input));
    const plan = await pool.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ' + publicSalonsSql, [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      21,
    ]);
    expect(plan.rows[0]['QUERY PLAN'][0].Plan['Actual Rows']).toBe(3);
    process.stdout.write('S5_CATALOG_EXPLAIN ' + JSON.stringify(plan.rows[0]['QUERY PLAN']) + '\n');
  });
  it('records development/test CLI grants and revocations without an HTTP privilege endpoint', async () => {
    const a = await actor();
    for (const action of ['grant', 'revoke']) {
      const r = spawnSync(
        process.execPath,
        ['dist/database/reviewer-permission.js', action, a.id, 'دلیل آزمون کنترل‌شده'],
        { env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: target.url }, encoding: 'utf8' },
      );
      expect(r.status, r.stderr).toBe(0);
      expect((await get('/review/access', a.session)).body.data.can_review).toBe(
        action === 'grant',
      );
    }
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS n FROM app.reviewer_permission_history WHERE user_id=$1',
          [a.id],
        )
      ).rows[0].n,
    ).toBe(2);
    const denied = spawnSync(
      process.execPath,
      ['dist/database/reviewer-permission.js', 'grant', a.id, 'forbidden production'],
      {
        env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: target.url },
        encoding: 'utf8',
      },
    );
    expect(denied.status).toBe(1);
    expect(
      (await pool.query('SELECT active FROM app.reviewer_permissions WHERE user_id=$1', [a.id]))
        .rows[0].active,
    ).toBe(false);
    await write('/review/permissions', a.session, { user_id: a.id }).expect(404);
  });
  it('returns one coherent reviewed snapshot during a write and no public content after commit', async () => {
    const owner = await actor(),
      review = await reviewer(),
      b = await ready(owner.session);
    await approve(b.id, owner.session, review.session);
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      await tx.query('SELECT id FROM app.businesses WHERE id=$1 FOR UPDATE', [b.id]);
      await tx.query(
        "UPDATE app.businesses SET state='draft',current_request_id=NULL,name='محتوای بررسی‌نشده' WHERE id=$1",
        [b.id],
      );
      await tx.query("UPDATE app.services SET name='خدمت بررسی‌نشده' WHERE id=$1", [b.sid]);
      const old = await get(`/catalog/salons/${b.id}`).expect(200);
      expect(old.body.data.name).toBe('سالن نیلوفر');
      expect(old.body.data.services[0].name).toBe('کوتاهی مو');
      await tx.query('COMMIT');
      await get(`/catalog/salons/${b.id}`).expect(404);
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
  });
});
