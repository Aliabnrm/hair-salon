import { describe, expect, it } from 'vitest';
import { validateDatabaseUrl, validateEnvironment } from './environment.js';

const DATABASE_URL = 'postgresql://local:fake@127.0.0.1:5432/local_test';
const AUTH_ALLOWED_ORIGINS = 'http://localhost:3000';
const AUTH_RATE_LIMIT_SECRET = 'test_only_auth_secret_never_use_in_production';
const validate = (input: Record<string, unknown>) =>
  validateEnvironment({
    DATABASE_URL,
    AUTH_ALLOWED_ORIGINS,
    AUTH_RATE_LIMIT_SECRET,
    ...input,
  });

describe('environment validation', () => {
  it('uses documented defaults only for absent settings', () => {
    expect(validate({})).toEqual({
      PORT: 3001,
      NODE_ENV: 'development',
      DATABASE_URL,
      AUTH_ALLOWED_ORIGINS: [AUTH_ALLOWED_ORIGINS],
      AUTH_RATE_LIMIT_SECRET,
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
      expect(
        validate({
          NODE_ENV: nodeEnvironment,
          AUTH_ALLOWED_ORIGINS: 'https://salon.example',
        }).NODE_ENV,
      ).toBe(nodeEnvironment);
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
      AUTH_ALLOWED_ORIGINS: [AUTH_ALLOWED_ORIGINS],
      AUTH_RATE_LIMIT_SECRET,
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

describe('authentication configuration', () => {
  it.each([
    undefined,
    '',
    '*',
    'null',
    'http://localhost:3000/',
    'https://salon.example/path',
    'https://u:p@salon.example',
    'https://salon.example?secret=sentinel',
  ])('rejects non-exact origins %s', (origin) => {
    expect(() => validate({ AUTH_ALLOWED_ORIGINS: origin })).toThrow(
      'AUTH_ALLOWED_ORIGINS',
    );
  });
  it('requires HTTPS origins and a private secret in production', () => {
    expect(() => validate({ NODE_ENV: 'production' })).toThrow(
      'AUTH_ALLOWED_ORIGINS',
    );
    expect(() =>
      validate({
        NODE_ENV: 'production',
        AUTH_ALLOWED_ORIGINS: 'https://salon.example',
        AUTH_RATE_LIMIT_SECRET: 'local_only_change_before_shared_use_32_bytes',
      }),
    ).toThrow('AUTH_RATE_LIMIT_SECRET');
    expect(
      validate({
        NODE_ENV: 'production',
        AUTH_ALLOWED_ORIGINS: 'https://salon.example',
      }).AUTH_ALLOWED_ORIGINS,
    ).toEqual(['https://salon.example']);
  });
  it.each([undefined, '', 'sentinel-short', ' '.repeat(40), 's'.repeat(257)])(
    'rejects missing or malformed secrets without echoing input',
    (secret) => {
      expect(() => validate({ AUTH_RATE_LIMIT_SECRET: secret })).toThrow(
        'AUTH_RATE_LIMIT_SECRET must be a private',
      );
    },
  );
});
