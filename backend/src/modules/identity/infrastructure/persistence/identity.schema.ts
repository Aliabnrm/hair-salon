import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { appSchema } from '../../../../database/app-schema.js';
export const users = appSchema.table(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'users_canonical_email',
      sql`${table.email} = lower(${table.email}) AND length(${table.email}) BETWEEN 3 AND 254`,
    ),
  ],
);
export const passwordCredentials = appSchema.table('password_credentials', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'restrict' }),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const sessions = appSchema.table(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
    check(
      'sessions_positive_lifetime',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check('sessions_sha256_token', sql`${table.tokenHash} ~ '^[a-f0-9]{64}$'`),
  ],
);
export const authAttemptBuckets = appSchema.table(
  'auth_attempt_buckets',
  {
    keyHash: text('key_hash').notNull(),
    operation: text('operation').notNull(),
    windowStartedAt: timestamp('window_started_at', {
      withTimezone: true,
    }).notNull(),
    attempts: integer('attempts').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.keyHash, table.operation, table.windowStartedAt],
    }),
    index('auth_attempt_buckets_expiry_idx').on(table.expiresAt),
    check('auth_attempt_buckets_positive_count', sql`${table.attempts} > 0`),
  ],
);
