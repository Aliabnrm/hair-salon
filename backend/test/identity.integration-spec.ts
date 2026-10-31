import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApplication } from './helpers/create-test-application.js';
import { createTestDatabase } from './helpers/test-database.js';
import { runMigration } from './helpers/run-migration.js';
import { IdentityStore } from '../src/modules/identity/application/ports/identity-store.port.js';
import { AuthAttemptStore } from '../src/modules/identity/application/ports/auth-attempt-store.port.js';

const origin = 'http://localhost:3000';
const password = 'test-only-strong-password';
const credentials = { email: 'customer@example.com', password };
function sessionSetCookie(response: request.Response): string {
  const values: unknown = response.headers['set-cookie'];
  if (!Array.isArray(values) || typeof values[0] !== 'string')
    throw new Error('Missing test session cookie.');
  return values[0];
}

function sessionCookie(response: request.Response): string {
  return sessionSetCookie(response).split(';')[0] ?? '';
}

describe('identity against real PostgreSQL', () => {
  let target: Awaited<ReturnType<typeof createTestDatabase>>;
  let fixture: Awaited<ReturnType<typeof createTestApplication>>;
  let second: Awaited<ReturnType<typeof createTestApplication>>;
  let pool: Pool;
  beforeAll(async () => {
    target = await createTestDatabase();
    expect((await runMigration(target.url)).status).toBe(0);
    pool = new Pool({ connectionString: target.url, max: 2 });
    fixture = await createTestApplication('test', [], target.url);
    second = await createTestApplication('test', [], target.url);
  });
  beforeEach(async () => {
    await pool.query(
      'TRUNCATE app.sessions, app.password_credentials, app.users, app.auth_attempt_buckets',
    );
  });
  afterAll(async () => {
    await Promise.all([fixture?.app.close(), second?.app.close()]);
    await pool?.end();
    await target?.close();
  });
  const post = (route: string, body: object, alternate = false) =>
    request((alternate ? second : fixture).app.getHttpServer())
      .post(`/api/v1/auth/${route}`)
      .set('Origin', origin)
      .send(body);

  it('registers privately, signs in, persists a hashed session, resolves the same actor and revokes it', async () => {
    const registered = await post('register', {
      ...credentials,
      email: ' Customer@Example.COM ',
    }).expect(202);
    expect(registered.body.data).toEqual({ registration: 'received' });
    expect(registered.headers['set-cookie']).toBeUndefined();
    const loggedIn = await post('login', credentials)
      .set('X-Request-Id', 'identity-flow')
      .expect(200);
    expect(loggedIn.body.data.user).toMatchObject({
      email: credentials.email,
      email_verified: false,
    });
    expect(loggedIn.body.meta.request_id).toBe('identity-flow');
    const cookie = sessionCookie(loggedIn);
    const token = cookie.slice(cookie.indexOf('=') + 1);
    const header = sessionSetCookie(loggedIn);
    expect(header).toMatch(/HttpOnly/);
    expect(header).toMatch(/SameSite=Lax/);
    expect(header).toMatch(/Path=\//);
    expect(header).toMatch(/Max-Age=604800/);
    const rows = await pool.query(
      'SELECT c.password_hash, s.token_hash FROM app.password_credentials c JOIN app.sessions s ON c.user_id=s.user_id',
    );
    expect(rows.rows[0].password_hash).toMatch(/^\$argon2id\$/);
    expect(rows.rows[0].password_hash).not.toContain(password);
    expect(rows.rows[0].token_hash).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(JSON.stringify(loggedIn.body)).not.toContain(token);
    const current = await request(second.app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(current.body.data).toEqual(loggedIn.body.data);
    expect(current.headers['cache-control']).toBe('no-store');
    const out = await post('logout', {}).set('Cookie', cookie).expect(200);
    expect(sessionSetCookie(out)).toContain('Expires=Thu, 01 Jan 1970');
    await request(fixture.app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookie)
      .expect(401);
    await post('logout', {}).set('Cookie', cookie).expect(200);
    const stored = await pool.query('SELECT revoked_at FROM app.sessions');
    expect(stored.rows[0].revoked_at).toBeInstanceOf(Date);
    expect(JSON.stringify(fixture.logger.entries)).not.toContain(password);
    expect(JSON.stringify(fixture.logger.entries)).not.toContain(token);
    expect(JSON.stringify(fixture.logger.entries)).not.toContain(
      credentials.email,
    );
  });

  it('handles concurrent duplicate registrations atomically without changing the original credential', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        post(
          'register',
          {
            email: i % 2 ? 'Customer@Example.com' : credentials.email,
            password,
          },
          i % 2 === 0,
        ),
      ),
    );
    expect(results.map((result) => result.status)).toEqual(Array(6).fill(202));
    expect(
      results.every(
        (result) =>
          JSON.stringify(result.body.data) === '{"registration":"received"}',
      ),
    ).toBe(true);
    expect((await pool.query('SELECT * FROM app.users')).rows).toHaveLength(1);
    const before = (
      await pool.query('SELECT password_hash FROM app.password_credentials')
    ).rows;
    expect(before).toHaveLength(1);
    await post('register', {
      ...credentials,
      password: 'some-different-test-password',
    }).expect(202);
    expect(
      (await pool.query('SELECT password_hash FROM app.password_credentials'))
        .rows,
    ).toEqual(before);
    await post('login', credentials).expect(200);
    await post('login', {
      ...credentials,
      password: 'some-different-test-password',
    }).expect(401);
  });

  it('rolls back User creation if credential persistence fails', async () => {
    const store = fixture.app.get(IdentityStore);
    await pool.query(
      "ALTER TABLE app.password_credentials ADD CONSTRAINT test_credential_failure CHECK (password_hash='test-only-rejected-value')",
    );
    try {
      await expect(
        store.register(credentials.email, 'hash-rejected-by-test-constraint'),
      ).rejects.toThrow();
      expect((await pool.query('SELECT id FROM app.users')).rows).toHaveLength(
        0,
      );
    } finally {
      await pool.query(
        'ALTER TABLE app.password_credentials DROP CONSTRAINT test_credential_failure',
      );
    }
  });

  it('rejects missing, malformed, duplicate, expired and revoked cookies', async () => {
    await post('register', credentials).expect(202);
    const login = await post('login', credentials).expect(200);
    const cookie = sessionCookie(login);
    for (const value of [
      'hair_salon_session=invalid',
      `${cookie}; ${cookie}`,
      `hair_salon_session=${randomBytes(32).toString('base64url')}`,
    ]) {
      await request(fixture.app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', value)
        .expect(401);
    }
    await pool.query(
      "UPDATE app.sessions SET created_at=now()-interval '8 days', expires_at=now()-interval '1 second'",
    );
    await request(fixture.app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookie)
      .expect(401);
    const again = await post('login', credentials).expect(200);
    await pool.query('UPDATE app.sessions SET revoked_at=now()');
    await request(fixture.app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', sessionCookie(again))
      .expect(401);
  });

  it('rotates a presented session and cannot use another user id to access an account', async () => {
    await post('register', credentials).expect(202);
    await post('register', { email: 'other@example.com', password }).expect(
      202,
    );
    const first = await post('login', credentials).expect(200);
    const secondLogin = await post('login', {
      email: 'other@example.com',
      password,
    })
      .set('Cookie', sessionCookie(first))
      .expect(200);
    expect(sessionCookie(secondLogin)).not.toBe(sessionCookie(first));
    await request(fixture.app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', sessionCookie(first))
      .expect(401);
    const current = await request(fixture.app.getHttpServer())
      .get(`/api/v1/me?user_id=${first.body.data.user.id}`)
      .set('Cookie', sessionCookie(secondLogin))
      .expect(200);
    expect(current.body.data.user.email).toBe('other@example.com');
  });

  it('gives the same safe failure for an unknown email and an incorrect password', async () => {
    await post('register', credentials).expect(202);
    const first = await post('login', {
      ...credentials,
      password: 'wrong-test-password',
    })
      .set('X-Request-Id', 'safe-sign-in')
      .expect(401);
    const other = await post('login', {
      email: 'unknown@example.com',
      password,
    })
      .set('X-Request-Id', 'safe-sign-in')
      .expect(401);
    expect(first.body).toEqual(other.body);
    expect(first.headers['set-cookie']).toBeUndefined();
  });

  it('shares the email attempt budget across two real application instances', async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        post('login', credentials, i % 2 === 0),
      ),
    );
    expect(results.filter((result) => result.status === 401)).toHaveLength(10);
    const denied = results.filter((result) => result.status === 429);
    expect(denied).toHaveLength(2);
    expect(denied[0]?.body.error.code).toBe('RATE_LIMITED');
    expect(Number(denied[0]?.headers['retry-after'])).toBeGreaterThan(0);
    const buckets = await pool.query(
      'SELECT key_hash, attempts FROM app.auth_attempt_buckets ORDER BY attempts',
    );
    expect(buckets.rows.map((row) => row.attempts)).toEqual([11, 12]);
    expect(JSON.stringify(buckets.rows)).not.toContain(credentials.email);
  });

  it('does not trust spoofed forwarded IPs to bypass the registration limit', async () => {
    const results = [];
    for (let i = 0; i < 11; i++)
      results.push(
        await post('register', {
          email: `customer${i}@example.com`,
          password,
        }).set('X-Forwarded-For', `192.0.2.${i}`),
      );
    expect(results.slice(0, 10).every((result) => result.status === 202)).toBe(
      true,
    );
    expect(results[10]?.status).toBe(429);
    expect((await pool.query('SELECT id FROM app.users')).rows).toHaveLength(
      10,
    );
  });

  it('enforces the IP login quota independently of the email quota', async () => {
    // Reserve attempts via the real shared adapter, then exercise the HTTP boundary.
    const seed = await post('login', credentials).expect(401);
    expect(seed.headers['set-cookie']).toBeUndefined();
    await pool.query(
      "UPDATE app.auth_attempt_buckets SET attempts=60 WHERE operation='login' AND attempts=1",
    );
    const response = await post('login', {
      email: 'another@example.com',
      password,
    })
      .set('X-Forwarded-For', '203.0.113.9')
      .expect(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('cleans only expired buckets and old sessions, preserving current records', async () => {
    await pool.query(
      "INSERT INTO app.auth_attempt_buckets VALUES ('old-key','login',now()-interval '1 day',1,now()-interval '1 second')",
    );
    const adapter = second.app.get(AuthAttemptStore);
    expect((await adapter.consume('active-key', 'login', 10)).allowed).toBe(
      true,
    );
    expect(
      (await pool.query('SELECT key_hash FROM app.auth_attempt_buckets')).rows,
    ).toEqual([{ key_hash: 'active-key' }]);
    await post('register', credentials).expect(202);
    const user = (await pool.query('SELECT id FROM app.users')).rows[0];
    await pool.query(
      "INSERT INTO app.sessions (user_id, token_hash, created_at, expires_at) VALUES ($1,$2,now()-interval '10 days',now()-interval '2 days')",
      [user.id, createHash('sha256').update(randomUUID()).digest('hex')],
    );
    await post('login', credentials).expect(200);
    expect((await pool.query('SELECT id FROM app.sessions')).rows).toHaveLength(
      1,
    );
  });

  it('enforces real email uniqueness, credential/session FKs and token integrity', async () => {
    await post('register', credentials).expect(202);
    await expect(
      pool.query('INSERT INTO app.users (email) VALUES ($1)', [
        credentials.email,
      ]),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        'INSERT INTO app.password_credentials (user_id,password_hash) VALUES ($1,$2)',
        [randomUUID(), 'hash'],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      pool.query(
        "INSERT INTO app.sessions (user_id, token_hash, expires_at) VALUES ($1,'raw-token',now()+interval '1 day')",
        [randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('fails safely during a real owned-database outage and recovers in the same app', async () => {
    await post('register', credentials).expect(202);
    await pool.end();
    try {
      await target.admin.query(
        `ALTER DATABASE "${target.name}" ALLOW_CONNECTIONS false`,
      );
      await target.admin.query(
        'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1',
        [target.name],
      );
      const unavailable = await post('login', credentials).expect(503);
      expect(unavailable.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(JSON.stringify(unavailable.body)).not.toContain(target.name);
      await request(fixture.app.getHttpServer())
        .get('/api/v1/health/liveness')
        .expect(200);
    } finally {
      await target.admin.query(
        `ALTER DATABASE "${target.name}" ALLOW_CONNECTIONS true`,
      );
      pool = new Pool({ connectionString: target.url, max: 2 });
    }
    await post('login', credentials).expect(200);
  });

  it('sets the production host-only secure cookie and clears it with matching options', async () => {
    const production = await createTestApplication(
      'production',
      [],
      target.url,
    );
    try {
      await post('register', credentials).expect(202);
      const login = await request(production.app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Origin', origin)
        .send(credentials)
        .expect(200);
      const header = sessionSetCookie(login);
      expect(header).toMatch(/^__Host-hair_salon_session=/);
      expect(header).toContain('Secure');
      expect(header).toContain('HttpOnly');
      expect(header).not.toContain('Domain=');
      const cookie = sessionCookie(login);
      await request(production.app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', cookie)
        .expect(200);
      const out = await request(production.app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Origin', origin)
        .set('Cookie', cookie)
        .send({})
        .expect(200);
      expect(sessionSetCookie(out)).toContain('Secure');
      await request(production.app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', cookie)
        .expect(401);
    } finally {
      await production.app.close();
    }
  });
});
