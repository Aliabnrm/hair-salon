import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export async function runMigration(url: string | undefined) {
  return new Promise<{ status: number | null; output: string }>(
    (resolve, reject) => {
      const child = spawn(process.execPath, ['dist/database/migrate.js'], {
        cwd: fileURLToPath(new URL('../../', import.meta.url)),
        env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      const timeout = setTimeout(() => child.kill('SIGKILL'), 10_000);
      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      child.stderr.on('data', (data: Buffer) => {
        output += data.toString();
      });
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('close', (status) => {
        clearTimeout(timeout);
        resolve({ status, output });
      });
    },
  );
}
