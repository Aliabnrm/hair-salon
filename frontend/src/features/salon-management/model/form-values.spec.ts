import { describe, expect, it } from 'vitest';
import { tomanToRial, jalaliToIso, persianDate, digits } from './form-values';
import { apiRequest } from '../../../lib/api/http-client';
import { afterEach, vi } from 'vitest';
afterEach(() => vi.unstubAllGlobals());
describe('Iranian management contracts', () => {
  it('converts Persian and Arabic digits and integer toman without float rounding', () => {
    expect(digits('۱۲٣')).toBe('123');
    expect(tomanToRial('۲۵۰٬۰۰۰')).toBe(2500000);
    expect(tomanToRial('0')).toBe(0);
  });
  it.each(['12.5', '1e4', '-1', '1000000001', 'Infinity'])(
    'rejects invalid toman input %s',
    (value) => expect(() => tomanToRial(value)).toThrow(),
  );
  it('converts a valid Persian leap day and rejects an invalid one', () => {
    expect(jalaliToIso('۱۳۹۹/۱۲/۳۰')).toBe('2021-03-20');
    expect(() => jalaliToIso('۱۴۰۰/۱۲/۳۰')).toThrow();
    expect(() => jalaliToIso('۱۴۰۵/۱۳/۰۱')).toThrow();
    expect(jalaliToIso(persianDate('2026-11-01'))).toBe('2026-11-01');
  });
  it('keeps write metadata, credentials and private errors in the shared transport', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'VERSION_CONFLICT',
            message: 'نسخه تغییر کرده است.',
            request_id: 'safe-id',
            fields: { name: 'نام معتبر نیست.' },
          },
        }),
        { status: 409, headers: { 'Retry-After': '5' } },
      ),
    );
    vi.stubGlobal('fetch', fetch);
    const path =
      '/api/v1/businesses/11111111-1111-4111-8111-111111111111/services/22222222-2222-4222-8222-222222222222';
    await expect(
      apiRequest(path, {
        method: 'PATCH',
        body: { active: false },
        version: 3,
        idempotencyKey: 'safe-key',
      }),
    ).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
      retryAfter: 5,
      fields: { name: 'نام معتبر نیست.' },
    });
    expect(fetch).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        credentials: 'same-origin',
        cache: 'no-store',
        headers: expect.objectContaining({
          'If-Match': '"3"',
          'Idempotency-Key': 'safe-key',
        }),
      }),
    );
  });
  it('never sends session credentials to an arbitrary URL', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    for (const path of [
      'https://external.invalid/api/v1/me',
      '//external.invalid/api/v1/me',
      '/api/v1/unknown',
    ])
      await expect(apiRequest(path)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
