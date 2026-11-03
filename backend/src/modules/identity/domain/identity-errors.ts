export class InvalidCredentialsError extends Error {}
export class IdentityUnavailableError extends Error {}
export class AuthRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Authentication rate limit reached.');
  }
}
