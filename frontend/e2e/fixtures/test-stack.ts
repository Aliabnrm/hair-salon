import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { Pool } from 'pg';
import { test as base, expect } from '@playwright/test';
// Test infrastructure only: reuse the guarded owner/cleanup protocol; no backend app types enter the browser.
import { createTestDatabase } from '../../../backend/test/helpers/test-database';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const backendDirectory = fileURLToPath(
  new URL('../../../backend/', import.meta.url),
);
const frontendDirectory = fileURLToPath(new URL('../../', import.meta.url));
const nextExecutable = createRequire(
  new URL('../../package.json', import.meta.url),
).resolve('next/dist/bin/next');
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
interface OwnedProcess {
  child: ChildProcess;
  output(): string;
}
interface TestStack {
  origin: string;
  backendOrigin: string;
  pool: Pool;
  rateLimitSecret: string;
  frontendDirectory: string;
}

async function unusedPort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Test port allocation failed.');
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}
function start(
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): OwnedProcess {
  const child = spawn(process.execPath, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  let output = '';
  const record = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-12_000);
  };
  child.stdout?.on('data', record);
  child.stderr?.on('data', record);
  // A failed spawn is also checked by the readiness/exit path; no unhandled event.
  child.on('error', () => {
    output += '\nOwned test process failed to start.';
  });
  return { child, output: () => output };
}
async function stop(owned: OwnedProcess | undefined): Promise<void> {
  const child = owned?.child;
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null)
    return;
  const pid = child.pid;
  const exited = once(child, 'close').catch(() => undefined);
  const signal = (value: NodeJS.Signals) => {
    try {
      if (process.platform === 'win32') child.kill(value);
      else globalThis.process.kill(-pid, value);
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ESRCH'
      ))
        throw error;
    }
  };
  signal('SIGTERM');
  const graceful = await Promise.race([
    exited.then(() => true),
    pause(3000).then(() => false),
  ]);
  if (!graceful) {
    signal('SIGKILL');
    await exited;
  }
}
async function finished(owned: OwnedProcess, timeout: number): Promise<void> {
  const timer = setTimeout(() => {
    void stop(owned);
  }, timeout);
  try {
    const [code] = await once(owned.child, 'close');
    if (code !== 0)
      throw new Error(`Owned build/migration failed:\n${owned.output()}`);
  } finally {
    clearTimeout(timer);
  }
}
async function ready(owned: OwnedProcess, url: string): Promise<void> {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (owned.child.exitCode !== null || owned.child.signalCode !== null) break;
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(800) })).ok) return;
    } catch {
      /* Connection may not be listening yet. */
    }
    await pause(100);
  }
  throw new Error(`Owned test server was not ready:\n${owned.output()}`);
}
export const test = base.extend<object, { stack: TestStack }>({
  stack: [
    async ({ browserName }, use) => {
      if (browserName !== 'chromium')
        throw new Error('This transport fixture requires Chromium.');
      const database = await createTestDatabase();
      let backend: OwnedProcess | undefined;
      let frontend: OwnedProcess | undefined;
      let build: OwnedProcess | undefined;
      let migration: OwnedProcess | undefined;
      let pool: Pool | undefined;
      let ownedFrontend: string | undefined;
      const failures: unknown[] = [];
      try {
        const backendPort = await unusedPort();
        let frontendPort = await unusedPort();
        while (frontendPort === backendPort) frontendPort = await unusedPort();
        const backendOrigin = `http://127.0.0.1:${backendPort}`;
        const origin = `http://127.0.0.1:${frontendPort}`;
        const rateLimitSecret = randomBytes(32).toString('hex');
        const system = {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          TMPDIR: process.env.TMPDIR,
        };
        const backendEnvironment: NodeJS.ProcessEnv = {
          ...system,
          NODE_ENV: 'test',
          DATABASE_URL: database.url,
          PORT: String(backendPort),
          AUTH_ALLOWED_ORIGINS: origin,
          AUTH_RATE_LIMIT_SECRET: rateLimitSecret,
        };
        migration = start(
          ['dist/database/migrate.js'],
          backendDirectory,
          backendEnvironment,
        );
        await finished(migration, 15_000);
        backend = start(['dist/main.js'], backendDirectory, backendEnvironment);
        await ready(backend, `${backendOrigin}/api/v1/health/readiness`);
        const frontendEnvironment: NodeJS.ProcessEnv = {
          ...system,
          NODE_ENV: 'production',
          NEXT_TELEMETRY_DISABLED: '1',
          BACKEND_ORIGIN: backendOrigin,
        };
        // Build from an owned source copy: Next must not load the developer's
        // .env.local/.env.production.local or replace their .next output.
        await mkdir(`${root}work`, { recursive: true });
        ownedFrontend = await mkdtemp(`${root}work/sprint-03-browser-`);
        for (const name of [
          'src',
          'public',
          'package.json',
          'tsconfig.json',
          'next-env.d.ts',
          'next.config.ts',
          'postcss.config.mjs',
        ]) {
          await cp(`${frontendDirectory}${name}`, `${ownedFrontend}/${name}`, {
            recursive: true,
          });
        }
        // Resolve only this workspace's declared dependencies without copying private env or build output.
        await symlink(
          `${frontendDirectory}node_modules`,
          `${ownedFrontend}/node_modules`,
          'dir',
        );
        // Rewrites bind the destination at build time. This owned build targets this test's fresh API port.
        build = start(
          [nextExecutable, 'build', '--webpack'],
          ownedFrontend,
          frontendEnvironment,
        );
        await finished(build, 90_000);
        frontend = start(
          [
            nextExecutable,
            'start',
            '--hostname',
            '127.0.0.1',
            '--port',
            String(frontendPort),
          ],
          ownedFrontend,
          frontendEnvironment,
        );
        await ready(frontend, `${origin}/api/v1/health/liveness`);
        pool = new Pool({ connectionString: database.url, max: 1 });
        await use({
          origin,
          backendOrigin,
          pool,
          rateLimitSecret,
          frontendDirectory: ownedFrontend,
        });
      } catch (error) {
        failures.push(error);
      } finally {
        const results = await Promise.allSettled([
          stop(frontend),
          stop(build),
          stop(backend),
          stop(migration),
        ]);
        for (const result of results)
          if (result.status === 'rejected') failures.push(result.reason);
        try {
          await pool?.end();
        } catch (error) {
          failures.push(error);
        }
        try {
          await database.close();
        } catch (error) {
          failures.push(error);
        }
        if (ownedFrontend) {
          try {
            await rm(ownedFrontend, { recursive: true, force: true });
          } catch (error) {
            failures.push(error);
          }
        }
      }
      if (failures.length)
        throw new AggregateError(failures, 'The owned test stack failed.');
    },
    { scope: 'worker', timeout: 150_000 },
  ],
});
export { expect };
