import type { Request, Response } from 'express';
import type { NodeEnvironment } from '../../../../config/environment.js';
import { SESSION_LIFETIME_MS } from '../../application/session-token.js';
function cookieOptions(environment: NodeEnvironment) {
  return {
    httpOnly: true,
    secure: environment === 'production',
    sameSite: 'lax',
    path: '/',
  } as const;
}
function cookieName(environment: NodeEnvironment): string {
  return environment === 'production'
    ? '__Host-hair_salon_session'
    : 'hair_salon_session';
}
export function readSessionCookie(
  request: Pick<Request, 'headers'>,
  environment: NodeEnvironment,
): string | undefined {
  const values = (request.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${cookieName(environment)}=`));
  if (values.length !== 1) return undefined;
  const token = values[0]?.slice(cookieName(environment).length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}
export function setSessionCookie(
  response: Response,
  token: string,
  environment: NodeEnvironment,
): void {
  response.cookie(cookieName(environment), token, {
    ...cookieOptions(environment),
    maxAge: SESSION_LIFETIME_MS,
  });
}
export function clearSessionCookie(
  response: Response,
  environment: NodeEnvironment,
): void {
  response.clearCookie(cookieName(environment), cookieOptions(environment));
}
// Trust the actual socket peer only. Forwarded headers from a browser are untrusted.
export function authenticationPeer(request: Request): string {
  return (request.socket.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
}
