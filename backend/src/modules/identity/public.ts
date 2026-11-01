export { IdentityModule } from './identity.module.js';
export { SessionAuthGuard } from './presentation/http/session-auth.guard.js';
export {
  requireCurrentUser,
  type AuthenticatedRequest,
} from './presentation/http/authenticated-request.js';
export { CookieMutationGuard } from './presentation/http/cookie-mutation.guard.js';
export { SecurityRateLimiter } from './infrastructure/persistence/security-rate-limiter.js';
export { IdentityExceptionFilter } from './presentation/http/identity-exception.filter.js';
