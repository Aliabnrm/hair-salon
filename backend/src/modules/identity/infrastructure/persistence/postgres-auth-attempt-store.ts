import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { AuthAttemptStore } from '../../application/ports/auth-attempt-store.port.js';
import { IdentityUnavailableError } from '../../domain/identity-errors.js';
@Injectable()
export class PostgresAuthAttemptStore extends AuthAttemptStore {
  constructor(private readonly database: DatabaseProvider) {
    super();
  }
  async consume(keyHash: string, operation: string, maximum: number) {
    try {
      const result = await this.database.db.execute<{
        attempts: number;
        retry_after: number;
      }>(sql`
        INSERT INTO app.auth_attempt_buckets (key_hash, operation, window_started_at, attempts, expires_at)
        VALUES (${keyHash}, ${operation}, to_timestamp(floor(extract(epoch FROM now()) / 900) * 900), 1,
          to_timestamp((floor(extract(epoch FROM now()) / 900) + 1) * 900))
        ON CONFLICT (key_hash, operation, window_started_at) DO UPDATE
          SET attempts = least(app.auth_attempt_buckets.attempts + 1, ${maximum + 1})
        RETURNING attempts, greatest(1, ceil(extract(epoch FROM (expires_at - now()))))::integer AS retry_after`);
      await this.database.db
        .execute(sql`DELETE FROM app.auth_attempt_buckets WHERE (key_hash, operation, window_started_at) IN
        (SELECT key_hash, operation, window_started_at FROM app.auth_attempt_buckets WHERE expires_at < now() LIMIT 100)`);
      const row = result.rows[0];
      if (!row) throw new IdentityUnavailableError();
      return {
        allowed: row.attempts <= maximum,
        retryAfterSeconds: row.retry_after,
      };
    } catch {
      throw new IdentityUnavailableError();
    }
  }
}
