import { describe, expect, it } from 'vitest';
import { validateTestDatabaseUrl } from './helpers/test-database.js';

describe('integration destination guard', () => {
  it.each([
    undefined,
    '',
    'postgresql://local@remote.example/hair_salon_test_admin',
    'postgresql://local@127.0.0.1/hair_salon',
    'postgresql://local@127.0.0.1/local_test?host=remote.example',
    'postgresql://local@127.0.0.1/local_test?dbname=production',
  ])('rejects unsafe destination', (value) => {
    expect(() => validateTestDatabaseUrl(value)).toThrow('TEST_DATABASE_URL');
  });
  it.each(['127.0.0.1', 'localhost', '[::1]', 'postgres'])(
    'accepts explicit test host %s',
    (host) => {
      const url = `postgresql://local:fake@${host}/hair_salon_test_admin`;
      expect(validateTestDatabaseUrl(url)).toBe(url);
    },
  );
});
