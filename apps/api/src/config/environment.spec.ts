import { describe, expect, it } from 'vitest';
import { validateDatabaseUrl, validateEnvironment } from './environment.js';

const DATABASE_URL = 'postgresql://local:fake@127.0.0.1:5432/local_test';
const validate = (input: Record<string, unknown>) =>
  validateEnvironment({ DATABASE_URL, ...input });

describe('environment validation', () => {
  it('uses documented defaults only for absent settings', () => {
    expect(validate({})).toEqual({
      PORT: 3001,
      NODE_ENV: 'development',
      DATABASE_URL,
    });
  });

  it.each(['1', '3001', '65535'])('accepts decimal port %s', (port) => {
    expect(validate({ PORT: port }).PORT).toBe(Number(port));
  });

  it.each([
    '',
    '0',
    '65536',
    '-1',
    '+3001',
    '3001.0',
    '3e3',
    ' 3001',
    '3001 ',
    '3001text',
    'Infinity',
    '9007199254740992',
    null,
    3001,
  ])('rejects invalid port %j without echoing its value', (port) => {
    expect(() => validate({ PORT: port })).toThrow(
      'PORT must be a decimal integer between 1 and 65535.',
    );
  });

  it.each(['development', 'test', 'production'])(
    'accepts environment %s',
    (nodeEnvironment) => {
      expect(validate({ NODE_ENV: nodeEnvironment }).NODE_ENV).toBe(
        nodeEnvironment,
      );
    },
  );

  it.each(['', 'staging', 'Production', null, 1])(
    'rejects invalid environment %j',
    (nodeEnvironment) => {
      expect(() => validate({ NODE_ENV: nodeEnvironment })).toThrow(
        'NODE_ENV must be development, test, or production.',
      );
    },
  );

  it('returns only the settings consumed by the application', () => {
    expect(validate({ INTERNAL_SECRET: 'test-only-value' })).toEqual({
      PORT: 3001,
      NODE_ENV: 'development',
      DATABASE_URL,
    });
  });
});

describe('database URL validation', () => {
  it.each([
    undefined,
    null,
    '',
    ' ',
    'sensitive-sentinel',
    'https://secret-sentinel/db',
    'postgresql:///db',
    'postgresql://localhost',
    'postgresql://localhost/',
    'postgresql://localhost/%20',
    'postgresql://localhost/db/other',
    'postgresql://localhost/%ZZ',
  ])('rejects malformed URL without echoing input', (value) => {
    expect(() => validateDatabaseUrl(value)).toThrow(
      'DATABASE_URL must be a PostgreSQL URL with a host and database.',
    );
    expect(() => validateEnvironment({ DATABASE_URL: value })).toThrow(
      'DATABASE_URL',
    );
  });
  it.each(['postgres:', 'postgresql:'])('accepts protocol %s', (protocol) => {
    const url = `${protocol}//local:fake@127.0.0.1:5432/local_test`;
    expect(validateDatabaseUrl(url)).toBe(url);
  });
});
