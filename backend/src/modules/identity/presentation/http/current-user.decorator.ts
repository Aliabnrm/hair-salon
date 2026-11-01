import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { requireCurrentUser, type AuthenticatedRequest } from './authenticated-request.js';
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return requireCurrentUser(context.switchToHttp().getRequest<AuthenticatedRequest>());
});
