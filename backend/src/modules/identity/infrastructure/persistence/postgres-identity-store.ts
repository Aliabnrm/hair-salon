import { Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { DatabaseProvider } from '../../../../database/database.provider.js';
import { IdentityUnavailableError } from '../../domain/identity-errors.js';
import {
  IdentityStore,
  type IdentityUser,
} from '../../application/ports/identity-store.port.js';
import { passwordCredentials, sessions, users } from './identity.schema.js';
const projection = {
  id: users.id,
  email: users.email,
  emailVerified: sql<boolean>`${users.emailVerifiedAt} IS NOT NULL`,
};
@Injectable()
export class PostgresIdentityStore extends IdentityStore {
  constructor(private readonly database: DatabaseProvider) {
    super();
  }
  async register(email: string, passwordHash: string): Promise<void> {
    await this.io(() =>
      this.database.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({ email })
          .onConflictDoNothing({ target: users.email })
          .returning({ id: users.id });
        if (user)
          await tx
            .insert(passwordCredentials)
            .values({ userId: user.id, passwordHash });
      }),
    );
  }
  async findPasswordIdentity(email: string) {
    return this.io(async () => {
      const [row] = await this.database.db
        .select({
          ...projection,
          passwordHash: passwordCredentials.passwordHash,
        })
        .from(users)
        .innerJoin(
          passwordCredentials,
          eq(users.id, passwordCredentials.userId),
        )
        .where(eq(users.email, email))
        .limit(1);
      return row
        ? {
            user: {
              id: row.id,
              email: row.email,
              emailVerified: row.emailVerified,
            },
            passwordHash: row.passwordHash,
          }
        : undefined;
    });
  }
  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    previousHash?: string,
  ): Promise<void> {
    await this.io(() =>
      this.database.db.transaction(async (tx) => {
        // Bounded cleanup of rows owned by this capability; no scheduler or unbounded DELETE.
        await tx.execute(sql`DELETE FROM app.sessions WHERE id IN (SELECT id FROM app.sessions
        WHERE expires_at < now() - interval '24 hours' OR revoked_at < now() - interval '24 hours' LIMIT 100)`);
        if (previousHash)
          await tx
            .update(sessions)
            .set({ revokedAt: sql`now()` })
            .where(eq(sessions.tokenHash, previousHash));
        await tx.insert(sessions).values({ userId, tokenHash, expiresAt });
      }),
    );
  }
  async resolveSession(tokenHash: string): Promise<IdentityUser | undefined> {
    return this.io(async () => {
      const [user] = await this.database.db
        .select(projection)
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.tokenHash, tokenHash),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, sql`now()`),
          ),
        )
        .limit(1);
      return user;
    });
  }
  async revokeSession(tokenHash: string): Promise<void> {
    await this.io(async () => {
      await this.database.db
        .update(sessions)
        .set({ revokedAt: sql`coalesce(${sessions.revokedAt}, now())` })
        .where(eq(sessions.tokenHash, tokenHash));
    });
  }
  private async io<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new IdentityUnavailableError();
    }
  }
}
