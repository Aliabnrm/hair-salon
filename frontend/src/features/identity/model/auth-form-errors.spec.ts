import { describe, expect, it } from 'vitest';
import { passwordError } from './auth-form-errors';
describe('password form guidance', () => {
  it('counts Unicode code points instead of truncating valid password-manager input', () => {
    expect(passwordError('🔑'.repeat(128))).toBeUndefined();
    expect(passwordError('🔑'.repeat(129))).toBeDefined();
    expect(passwordError(' '.repeat(12))).toBeUndefined();
    expect(passwordError('🔑'.repeat(11))).toBeDefined();
  });
});
