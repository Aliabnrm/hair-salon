import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';

describe('environment validation', () => {
  it('uses documented defaults only for absent settings', () => {
    expect(validateEnvironment({})).toEqual({
      PORT: 3001,
      NODE_ENV: 'development',
    });
  });

  it.each(['1', '3001', '65535'])('accepts decimal port %s', (port) => {
    expect(validateEnvironment({ PORT: port }).PORT).toBe(Number(port));
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
    expect(() => validateEnvironment({ PORT: port })).toThrow(
      'PORT must be a decimal integer between 1 and 65535.',
    );
  });

  it.each(['development', 'test', 'production'])(
    'accepts environment %s',
    (nodeEnvironment) => {
      expect(validateEnvironment({ NODE_ENV: nodeEnvironment }).NODE_ENV).toBe(
        nodeEnvironment,
      );
    },
  );

  it.each(['', 'staging', 'Production', null, 1])(
    'rejects invalid environment %j',
    (nodeEnvironment) => {
      expect(() => validateEnvironment({ NODE_ENV: nodeEnvironment })).toThrow(
        'NODE_ENV must be development, test, or production.',
      );
    },
  );

  it('returns only the settings consumed by the application', () => {
    expect(validateEnvironment({ INTERNAL_SECRET: 'test-only-value' })).toEqual(
      {
        PORT: 3001,
        NODE_ENV: 'development',
      },
    );
  });
});
