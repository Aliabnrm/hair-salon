import {
  apiRequest,
  HttpFailure,
  isRecord,
} from '../../../lib/api/http-client';
import type { Credentials, SessionUser } from '../model/identity.types';

function parseUser(data: unknown): SessionUser {
  const user = isRecord(data) ? data.user : undefined;
  if (
    !isRecord(user) ||
    typeof user.id !== 'string' ||
    typeof user.email !== 'string' ||
    typeof user.email_verified !== 'boolean'
  )
    throw new HttpFailure(502, 'INVALID_RESPONSE');
  return { id: user.id, email: user.email, emailVerified: user.email_verified };
}
export async function register(credentials: Credentials): Promise<void> {
  const data = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: credentials,
  });
  if (!isRecord(data) || data.registration !== 'received')
    throw new HttpFailure(502, 'INVALID_RESPONSE');
}
export async function signIn(credentials: Credentials): Promise<SessionUser> {
  return parseUser(
    await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: credentials,
    }),
  );
}
export async function currentUser(
  signal?: AbortSignal,
): Promise<SessionUser | null> {
  try {
    return parseUser(await apiRequest('/api/v1/me', signal ? { signal } : {}));
  } catch (error) {
    if (error instanceof HttpFailure && error.status === 401) return null;
    throw error;
  }
}
export async function signOut(): Promise<void> {
  const data = await apiRequest('/api/v1/auth/logout', {
    method: 'POST',
    body: {},
  });
  if (!isRecord(data) || data.signed_out !== true)
    throw new HttpFailure(502, 'INVALID_RESPONSE');
}
