import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('compiled application startup', () => {
  it.each([
    { PORT: 'test-only-invalid-port', NODE_ENV: 'test' },
    { PORT: '3001', NODE_ENV: 'test-only-invalid-environment' },
  ])('fails before listening with invalid configuration %j', (settings) => {
    const result = spawnSync(process.execPath, ['dist/main.js'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...process.env, ...settings },
      encoding: 'utf8',
      timeout: 5_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('API startup failed');
    expect(result.stdout + result.stderr).not.toContain('test-only-invalid');
  });
});
