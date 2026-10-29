import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.integration-spec.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused_test',
    },
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 20_000,
  },
});
