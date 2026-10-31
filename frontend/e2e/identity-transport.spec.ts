import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { test, expect } from './fixtures/test-stack';

test('real browser preserves HttpOnly cookie through Next, reloads the same identity and rejects a revoked cookie', async ({
  page,
  context,
  browser,
  stack,
}) => {
  const credentials = {
    email: `browser-${randomUUID()}@example.com`,
    password: 'test-only-browser-password',
  };
  await page.goto(`${stack.origin}/api/v1/health/liveness`);
  const registered = await page.evaluate(async (body) => {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      requestId: response.headers.get('x-request-id'),
    };
  }, credentials);
  expect(registered.status).toBe(202);
  expect(registered.data.data).toEqual({ registration: 'received' });
  expect(registered.requestId).toBe(registered.data.meta.request_id);
  const login = await page.evaluate(async (body) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': 'browser-sign-in',
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      cache: response.headers.get('cache-control'),
      id: response.headers.get('x-request-id'),
    };
  }, credentials);
  expect(login.status).toBe(200);
  expect(login.id).toBe('browser-sign-in');
  expect(login.data.meta.request_id).toBe(login.id);
  expect(login.cache).toBe('no-store');
  expect(login.data.data.user.email).toBe(credentials.email);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    'hair_salon_session',
  );
  const cookie = (await context.cookies()).find(
    (value) => value.name === 'hair_salon_session',
  );
  if (!cookie)
    throw new Error('The browser did not accept the test session cookie.');
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe('Lax');
  expect(cookie.path).toBe('/');
  const stored = await stack.pool.query('SELECT token_hash FROM app.sessions');
  expect(stored.rows[0].token_hash).toBe(
    createHash('sha256').update(cookie.value).digest('hex'),
  );
  await page.reload();
  const current = await page.evaluate(async () =>
    (await fetch('/api/v1/me')).json(),
  );
  expect(current.data).toEqual(login.data.data);
  const other = await browser.newContext();
  try {
    const otherPage = await other.newPage();
    await otherPage.goto(`${stack.origin}/api/v1/health/liveness`);
    expect(
      await otherPage.evaluate(async () => (await fetch('/api/v1/me')).status),
    ).toBe(401);
  } finally {
    await other.close();
  }
  expect(
    await page.evaluate(
      async () =>
        (
          await fetch('/api/v1/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          })
        ).status,
    ),
  ).toBe(200);
  expect(
    await page.evaluate(async () => (await fetch('/api/v1/me')).status),
  ).toBe(401);
  await context.addCookies([cookie]);
  expect(
    await page.evaluate(async () => (await fetch('/api/v1/me')).status),
  ).toBe(401);
  const counts = await stack.pool.query(
    'SELECT count(*)::integer AS count FROM app.sessions WHERE revoked_at IS NOT NULL',
  );
  expect(counts.rows[0].count).toBe(1);
});

test('same-site cross-origin browser POST cannot revoke an authenticated session', async ({
  page,
  context,
  stack,
}) => {
  const credentials = {
    email: `csrf-${randomUUID()}@example.com`,
    password: 'test-only-browser-password',
  };
  await page.goto(`${stack.origin}/api/v1/health/liveness`);
  await page.evaluate(async (body) => {
    for (const action of ['register', 'login']) {
      const response = await fetch(`/api/v1/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Test sign-in failed.');
    }
  }, credentials);
  const foreign = await context.newPage();
  try {
    await foreign.goto(`${stack.backendOrigin}/api/v1/health/liveness`);
    const result = await foreign.evaluate(async (origin) => {
      const response = await fetch(`${origin}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: '{}',
      });
      return response.type;
    }, stack.origin);
    expect(result).toBe('opaque');
    expect(
      await page.evaluate(async () => (await fetch('/api/v1/me')).status),
    ).toBe(200);
  } finally {
    await foreign.close();
  }
});

test('forwarded IP spoofing does not change the shared quota through the real proxy', async ({
  page,
  stack,
}) => {
  await stack.pool.query('TRUNCATE app.auth_attempt_buckets');
  await page.goto(`${stack.origin}/api/v1/health/liveness`);
  const responses = await page.evaluate(async () => {
    const status = [];
    for (let index = 0; index < 11; index++) {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `192.0.2.${index}`,
        },
        body: JSON.stringify({
          email: 'unknown-browser@example.com',
          password: 'test-only-browser-password',
        }),
      });
      status.push({
        status: response.status,
        retry: response.headers.get('retry-after'),
      });
    }
    return status;
  });
  expect(
    responses.slice(0, 10).every((response) => response.status === 401),
  ).toBe(true);
  expect(responses[10]?.status).toBe(429);
  expect(Number(responses[10]?.retry)).toBeGreaterThan(0);
});

test('browser bundles do not contain backend credentials or the rate-limit secret', async ({
  stack,
}) => {
  const directory = `${stack.frontendDirectory}/.next/static/`;
  async function inspect(path: string): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) await inspect(child);
      else if (entry.name.endsWith('.js')) {
        const content = await readFile(child, 'utf8');
        expect(content.includes(stack.rateLimitSecret)).toBe(false);
        expect(content.includes('postgresql://')).toBe(false);
      }
    }
  }
  await inspect(directory);
});
