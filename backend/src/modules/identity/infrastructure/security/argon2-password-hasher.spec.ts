import { describe, expect, it } from 'vitest';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';

describe('password storage', () => {
  it('uses salted Argon2id and verifies the exact password without trimming', async () => {
    const hasher = new Argon2PasswordHasher();
    await hasher.onModuleInit();
    const password = '  test password with whitespace  ';
    const [first, second] = await Promise.all([
      hasher.hash(password),
      hasher.hash(password),
    ]);
    expect(first).toMatch(/^\$argon2id\$/);
    expect(first).not.toContain(password);
    expect(first).not.toBe(second);
    expect(await hasher.verify(password, first)).toBe(true);
    expect(await hasher.verify(password.trim(), first)).toBe(false);
    expect(await hasher.verify(password)).toBe(false);
  });
});
