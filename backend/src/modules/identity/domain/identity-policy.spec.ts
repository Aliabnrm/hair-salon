import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './email-policy.js';
import { isValidPassword } from './password-policy.js';

describe('identity input policies', () => {
  it('canonicalizes once without provider-specific alias guessing', () => {
    expect(normalizeEmail('  Customer.Name+salon@Example.COM ')).toBe(
      'customer.name+salon@example.com',
    );
    expect(normalizeEmail('customer.name@example.com')).not.toBe(
      normalizeEmail('customername@example.com'),
    );
  });
  it.each([
    '',
    'a',
    'a@@example.com',
    '.a@example.com',
    'a..b@example.com',
    'a.@example.com',
    'a@-example.com',
    'a@example..com',
    'a@localhost',
    'نام@example.com',
    'a@exa mple.com',
    `${'a'.repeat(65)}@example.com`,
    `a@${'x'.repeat(64)}.com`,
  ])('rejects malformed email %s', (email) => {
    expect(normalizeEmail(email)).toBeUndefined();
  });
  it('counts Unicode code points and preserves whitespace in valid passwords', () => {
    expect(isValidPassword('x'.repeat(11))).toBe(false);
    expect(isValidPassword('x'.repeat(12))).toBe(true);
    expect(isValidPassword('🔑'.repeat(128))).toBe(true);
    expect(isValidPassword('🔑'.repeat(129))).toBe(false);
    expect(isValidPassword('  twelve spaces  ')).toBe(true);
  });
});
