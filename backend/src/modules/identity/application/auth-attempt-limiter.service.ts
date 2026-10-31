import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../config/environment.js';
import { AuthRateLimitError } from '../domain/identity-errors.js';
import { AuthAttemptStore } from './ports/auth-attempt-store.port.js';
@Injectable()
export class AuthAttemptLimiter {
  constructor(
    private readonly store: AuthAttemptStore,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  async check(
    operation: 'login' | 'register',
    ip: string,
    email: string,
  ): Promise<void> {
    await this.consume(operation, `ip:${ip}`, operation === 'login' ? 60 : 10);
    if (operation === 'login')
      await this.consume(operation, `email:${email}`, 10);
  }
  private async consume(
    operation: string,
    key: string,
    maximum: number,
  ): Promise<void> {
    const hash = createHmac(
      'sha256',
      this.config.get('AUTH_RATE_LIMIT_SECRET', { infer: true }),
    )
      .update(key)
      .digest('hex');
    const result = await this.store.consume(hash, operation, maximum);
    if (!result.allowed) throw new AuthRateLimitError(result.retryAfterSeconds);
  }
}
