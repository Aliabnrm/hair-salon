import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../../config/environment.js';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { CapabilityError } from '../../../../common/domain/capability-error.js';
@Injectable()
export class SecurityRateLimiter {
  constructor(
    private readonly database: DatabaseProvider,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  async consume(operation: string, subject: string, maximum: number, seconds = 900): Promise<void> {
    const key = createHmac('sha256', this.config.get('AUTH_RATE_LIMIT_SECRET', { infer: true }))
      .update(subject)
      .digest('hex');
    const result = await this.database.pool.query<{
      attempts: number;
      retry_after: number;
    }>(
      `INSERT INTO app.auth_attempt_buckets(key_hash,operation,window_started_at,attempts,expires_at)
   VALUES($1,$2,to_timestamp(floor(extract(epoch FROM now())/$4)*$4),1,to_timestamp((floor(extract(epoch FROM now())/$4)+1)*$4))
   ON CONFLICT(key_hash,operation,window_started_at) DO UPDATE SET attempts=least(app.auth_attempt_buckets.attempts+1,$3+1)
   RETURNING attempts,greatest(1,ceil(extract(epoch FROM(expires_at-now()))))::integer AS retry_after`,
      [key, operation, maximum, seconds],
    );
    // Bound cleanup work; expired buckets do not affect current attempts.
    await this.database.pool.query(
      `DELETE FROM app.auth_attempt_buckets WHERE (key_hash,operation,window_started_at) IN (SELECT key_hash,operation,window_started_at FROM app.auth_attempt_buckets WHERE expires_at < now() LIMIT 100)`,
    );
    const row = result.rows[0];
    if (!row) throw new CapabilityError(503, 'SERVICE_UNAVAILABLE', 'سرویس موقتاً در دسترس نیست.');
    if (row.attempts > maximum)
      throw new CapabilityError(
        429,
        'RATE_LIMITED',
        'تعداد تلاش‌ها زیاد است. کمی بعد تلاش کنید.',
        undefined,
        row.retry_after,
      );
  }
}
