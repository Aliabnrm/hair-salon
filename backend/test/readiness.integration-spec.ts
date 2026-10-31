import { createServer, connect, type Socket } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DatabaseProvider,
  DATABASE_LIMITS,
} from '../src/database/database.provider.js';
import { createTestApplication } from './helpers/create-test-application.js';
import { createTestDatabase } from './helpers/test-database.js';

const READY = '/api/v1/health/readiness';
const LIVE = '/api/v1/health/liveness';

function expectSuccess(response: {
  body: unknown;
  headers: Record<string, string>;
}) {
  expect(response.body).toEqual({
    data: { status: 'ok' },
    meta: { request_id: response.headers['x-request-id'] },
  });
}
function expectUnavailable(response: {
  body: unknown;
  headers: Record<string, string>;
}) {
  expect(response.body).toEqual({
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'سرویس موقتاً آماده پاسخ‌گویی نیست.',
      request_id: response.headers['x-request-id'],
      retryable: false,
    },
  });
}

describe('readiness with an isolated real PostgreSQL database', () => {
  let target: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: INestApplication;
  let entries: unknown[];
  beforeAll(async () => {
    target = await createTestDatabase();
    const result = await createTestApplication('test', [], target.url);
    app = result.app;
    entries = result.logger.entries;
  });
  afterAll(async () => {
    await app?.close();
    await target?.close();
  });

  it('starts lazily and returns the exact success envelope using a real query', async () => {
    expect(app.get(DatabaseProvider).pool.totalCount).toBe(0);
    expectSuccess(
      await request(app.getHttpServer())
        .get(READY)
        .set('X-Request-Id', 'ready-real-db')
        .expect(200),
    );
    expect(app.get(DatabaseProvider).pool.idleCount).toBe(1);
  });

  it('loses its database, keeps liveness and recovers in the same application', async () => {
    try {
      // Only the UUID database created by this suite becomes unavailable.
      await target.admin.query(
        `ALTER DATABASE "${target.name}" ALLOW_CONNECTIONS false`,
      );
      await target.admin.query(
        'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1',
        [target.name],
      );
      // Allow pg to deliver the asynchronous error on idle sockets.
      await new Promise((resolve) => setTimeout(resolve, 100));
      expectUnavailable(
        await request(app.getHttpServer())
          .get(READY)
          .set('X-Request-Id', 'db-outage')
          .expect(503),
      );
      expectSuccess(await request(app.getHttpServer()).get(LIVE).expect(200));
      expect(entries).toContainEqual({ event: 'database_idle_error' });
      expect(entries).toContainEqual({
        event: 'database_probe_failed',
        phase: 'acquire',
      });
    } finally {
      await target.admin.query(
        `ALTER DATABASE "${target.name}" ALLOW_CONNECTIONS true`,
      );
    }
    expectSuccess(await request(app.getHttpServer()).get(READY).expect(200));
  });

  it('bounds waiting on a saturated pool and removes the waiting request', async () => {
    const pool = app.get(DatabaseProvider).pool;
    const clients = await Promise.all(
      Array.from({ length: DATABASE_LIMITS.max }, () => pool.connect()),
    );
    try {
      const started = performance.now();
      expectUnavailable(
        await request(app.getHttpServer()).get(READY).expect(503),
      );
      expect(performance.now() - started).toBeLessThan(3_000);
      expect(pool.waitingCount).toBe(0);
      expectSuccess(await request(app.getHttpServer()).get(LIVE).expect(200));
    } finally {
      clients.forEach((client) => client.release());
    }
    expectSuccess(await request(app.getHttpServer()).get(READY).expect(200));
  });

  it('keeps database identity and raw failures out of public logs', () => {
    const logs = JSON.stringify(entries);
    for (const sensitive of [
      target.url,
      target.name,
      'SELECT 1',
      new URL(target.url).hostname,
    ]) {
      expect(logs).not.toContain(sensitive);
    }
    expect(entries).toContainEqual(
      expect.objectContaining({
        event: 'http_error',
        code: 'SERVICE_UNAVAILABLE',
        status: 503,
      }),
    );
  });
});

// A TCP relay keeps a real PostgreSQL connection, then simulates a silent network.
async function createRelay(databaseUrl: string) {
  const destination = new URL(databaseUrl);
  const sockets = new Set<Socket>();
  let stall = false;
  const server = createServer((incoming) => {
    const upstream = connect(
      Number(destination.port || 5432),
      destination.hostname,
    );
    for (const socket of [incoming, upstream]) {
      sockets.add(socket);
      socket.on('error', () => {
        incoming.destroy();
        upstream.destroy();
      });
      socket.on('close', () => {
        sockets.delete(socket);
        incoming.destroy();
        upstream.destroy();
      });
    }
    incoming.on('data', (data) => {
      if (!stall) upstream.write(data);
    });
    upstream.on('data', (data) => {
      if (!stall) incoming.write(data);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Expected TCP relay.');
  const url = new URL(databaseUrl);
  url.hostname = '127.0.0.1';
  url.port = String(address.port);
  return {
    url: url.toString(),
    sockets,
    setStall(value: boolean) {
      stall = value;
    },
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

describe('bounded network failure and recovery', () => {
  it('destroys a silent query connection and recovers without recreating Nest', async () => {
    const target = await createTestDatabase();
    const relay = await createRelay(target.url);
    const { app, logger } = await createTestApplication(
      'test',
      [],
      `${relay.url}?query_timeout=60000`,
    );
    try {
      expectSuccess(await request(app.getHttpServer()).get(READY).expect(200));
      relay.setStall(true);
      const started = performance.now();
      expectUnavailable(
        await request(app.getHttpServer()).get(READY).expect(503),
      );
      expect(performance.now() - started).toBeLessThan(3_000);
      expect(app.get(DatabaseProvider).pool.totalCount).toBe(0);
      await expect.poll(() => relay.sockets.size).toBe(0);
      expect(logger.entries).toContainEqual({
        event: 'database_probe_failed',
        phase: 'query',
      });
      relay.setStall(false);
      expectSuccess(await request(app.getHttpServer()).get(READY).expect(200));
      await app.close();
      expect(app.get(DatabaseProvider).pool.totalCount).toBe(0);
    } finally {
      await app.close();
      await relay.close();
      await target.close();
    }
  });

  it('bounds an unresponsive connection handshake and cleans abandoned sockets', async () => {
    const target = await createTestDatabase();
    const relay = await createRelay(target.url);
    relay.setStall(true);
    const { app } = await createTestApplication('test', [], relay.url);
    try {
      const started = performance.now();
      expectUnavailable(
        await request(app.getHttpServer()).get(READY).expect(503),
      );
      expect(performance.now() - started).toBeLessThan(3_000);
      expect(app.get(DatabaseProvider).pool.totalCount).toBe(0);
      expect(app.get(DatabaseProvider).pool.waitingCount).toBe(0);
      await expect.poll(() => relay.sockets.size).toBe(0);
      relay.setStall(false);
      expectSuccess(await request(app.getHttpServer()).get(READY).expect(200));
    } finally {
      await app.close();
      await relay.close();
      await target.close();
    }
  });

  it('boots HTTP with a refused connection and never exposes a credential sentinel', async () => {
    const { app, logger } = await createTestApplication(
      'test',
      [],
      'postgresql://db-sensitive-sentinel:db-sensitive-sentinel@127.0.0.1:1/unreachable_test',
    );
    try {
      expectSuccess(await request(app.getHttpServer()).get(LIVE).expect(200));
      expectUnavailable(
        await request(app.getHttpServer()).get(READY).expect(503),
      );
      expect(JSON.stringify(logger.entries)).not.toContain(
        'db-sensitive-sentinel',
      );
    } finally {
      await app.close();
    }
  });
});
