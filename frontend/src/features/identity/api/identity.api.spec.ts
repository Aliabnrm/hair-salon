import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpFailure } from '../../../lib/api/http-client';
import { currentUser, register, signIn, signOut } from './identity.api';

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
afterEach(() => vi.unstubAllGlobals());
describe('browser identity API contract', () => {
  it('maps only public user fields and sends credentials through the same-origin cookie channel', async () => {
    const fetch = vi.fn().mockResolvedValue(
      response({
        data: {
          user: {
            id: 'test-user',
            email: 'customer@example.com',
            email_verified: false,
          },
        },
        meta: { request_id: 'safe-id' },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const user = await signIn({
      email: 'customer@example.com',
      password: 'test-only-password',
    });
    expect(user).toEqual({
      id: 'test-user',
      email: 'customer@example.com',
      emailVerified: false,
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      }),
    );
    expect(JSON.stringify(user)).not.toContain('test-only-password');
  });
  it('treats only 401 as an absent session; outages remain visible failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          response({ error: { code: 'UNAUTHORIZED', request_id: 'one' } }, 401),
        )
        .mockResolvedValueOnce(
          response(
            { error: { code: 'SERVICE_UNAVAILABLE', request_id: 'two' } },
            503,
          ),
        ),
    );
    expect(await currentUser()).toBeNull();
    await expect(currentUser()).rejects.toMatchObject({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      requestId: 'two',
    });
  });
  it('never treats malformed success or a proxy HTML response as successful authentication', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response({ data: { user: { id: 'partial' } } }))
        .mockResolvedValueOnce(
          new Response('<html>proxy failure</html>', { status: 502 }),
        ),
    );
    await expect(
      signIn({ email: 'customer@example.com', password: 'test-only-password' }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    await expect(currentUser()).rejects.toBeInstanceOf(HttpFailure);
  });
  it('keeps register private and requires actual server acknowledgement for sign-out', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          response({ data: { registration: 'received' } }, 202),
        )
        .mockResolvedValueOnce(response({ data: { signed_out: false } }))
        .mockResolvedValueOnce(response({ data: { signed_out: true } })),
    );
    expect(
      await register({
        email: 'customer@example.com',
        password: 'test-only-password',
      }),
    ).toBeUndefined();
    await expect(signOut()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    await expect(signOut()).resolves.toBeUndefined();
  });
  it('propagates aborted requests instead of reporting an anonymous or signed-out state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    );
    await expect(
      currentUser(new AbortController().signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
