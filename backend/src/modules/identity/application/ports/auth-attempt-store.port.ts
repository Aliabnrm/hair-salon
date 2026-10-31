export interface AuthAttemptResult {
  allowed: boolean;
  retryAfterSeconds: number;
}
export abstract class AuthAttemptStore {
  abstract consume(
    keyHash: string,
    operation: string,
    maximum: number,
  ): Promise<AuthAttemptResult>;
}
