import { describe, expect, it } from 'vitest';
import { validateBackendOrigin } from './environment.server';

describe('server-only API origin validation', () => {
  it.each([
    'http://127.0.0.1:3001',
    'http://localhost:4001',
    'https://api.example.com',
  ])('accepts a precise local HTTP or HTTPS origin %s', (origin) => {
    expect(validateBackendOrigin(origin)).toBe(origin);
  });
  it.each([
    undefined,
    '',
    '*',
    'http://remote.example',
    'https://user:secret@api.example.com',
    'https://api.example.com/',
    'https://api.example.com/api',
    'https://api.example.com?secret=sentinel',
    '//api.example.com',
  ])(
    'rejects unsafe or ambiguous destinations without echoing them',
    (origin) => {
      expect(() => validateBackendOrigin(origin)).toThrow(
        'BACKEND_ORIGIN must be an exact private HTTP or HTTPS origin.',
      );
    },
  );
});
