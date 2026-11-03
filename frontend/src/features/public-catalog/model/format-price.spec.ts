import { describe, it, expect } from 'vitest';
import { formatPrice } from './format-price';
describe('public IRR prices', () => {
  it('shows zero, typical price and the server ceiling in exact toman', () => {
    expect(formatPrice(0)).toBe('۰ تومان');
    expect(formatPrice(2500000)).toBe('۲۵۰٬۰۰۰ تومان');
    expect(formatPrice(10000000000)).toBe('۱٬۰۰۰٬۰۰۰٬۰۰۰ تومان');
  });
  it.each([-1, 1, 10.5, Infinity, Number.MAX_SAFE_INTEGER])('rejects invalid IRR %s', (value) =>
    expect(() => formatPrice(value)).toThrow(),
  );
});
