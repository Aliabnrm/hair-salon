import { UnauthorizedException } from '@nestjs/common';
import type { RequestContext } from '../../../../common/http/request-context.js';
import type { IdentityUser } from '../../application/ports/identity-store.port.js';
export type AuthenticatedRequest = RequestContext & {
  identityUser?: IdentityUser;
};

export function requireCurrentUser(request: AuthenticatedRequest): IdentityUser {
  if (!request.identityUser) throw new UnauthorizedException();
  return request.identityUser;
}
