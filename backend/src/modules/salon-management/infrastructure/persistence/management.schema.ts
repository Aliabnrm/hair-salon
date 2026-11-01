import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { appSchema } from '../../../../database/app-schema.js';
import { users } from '../../../identity/persistence-schema.js';
const times = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const businesses = appSchema.table(
  'businesses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    audience: text('audience').notNull(),
    city: text('city').notNull(),
    district: text('district'),
    publicAddress: text('public_address'),
    publicPhone: text('public_phone'),
    state: text('state').notNull().default('draft'),
    timezone: text('timezone').notNull().default('Asia/Tehran'),
    version: integer('version').notNull().default(1),
    hoursVersion: integer('hours_version').notNull().default(1),
    ...times(),
  },
  (t) => [
    check('business_state', sql`${t.state} = 'draft'`),
    check('business_timezone', sql`${t.timezone} = 'Asia/Tehran'`),
    check('business_audience', sql`${t.audience} IN ('men','women')`),
    check('business_name', sql`char_length(trim(${t.name})) BETWEEN 2 AND 120`),
    check('business_city', sql`char_length(trim(${t.city})) BETWEEN 2 AND 80`),
    check('business_versions', sql`${t.version}>0 AND ${t.hoursVersion}>0`),
  ],
);
export const businessMemberships = appSchema.table(
  'business_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role').notNull().default('owner'),
    active: boolean('active').notNull().default(true),
  },
  (t) => [
    unique('membership_business_user').on(t.businessId, t.userId),
    index('membership_user_idx').on(t.userId, t.active),
    check('membership_owner', sql`${t.role}='owner'`),
  ],
);
export const services = appSchema.table(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    name: text('name').notNull(),
    priceIrr: bigint('price_irr', { mode: 'number' }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    bufferBeforeMinutes: integer('buffer_before_minutes').notNull(),
    bufferAfterMinutes: integer('buffer_after_minutes').notNull(),
    active: boolean('active').notNull().default(true),
    version: integer('version').notNull().default(1),
    ...times(),
  },
  (t) => [
    unique('services_tenant_id').on(t.businessId, t.id),
    index('services_list_idx').on(t.businessId, t.active, t.createdAt, t.id),
    check('service_price', sql`${t.priceIrr} BETWEEN 0 AND 10000000000 AND ${t.priceIrr}%10=0`),
    check(
      'service_duration',
      sql`${t.durationMinutes} BETWEEN 1 AND 720 AND ${t.bufferBeforeMinutes} BETWEEN 0 AND 240 AND ${t.bufferAfterMinutes} BETWEEN 0 AND 240 AND ${t.durationMinutes}+${t.bufferBeforeMinutes}+${t.bufferAfterMinutes}<=1440`,
    ),
    check('service_name', sql`char_length(trim(${t.name})) BETWEEN 2 AND 120`),
    check('service_version', sql`${t.version}>0`),
  ],
);
export const staffProfiles = appSchema.table(
  'staff_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    displayName: text('display_name').notNull(),
    active: boolean('active').notNull().default(true),
    version: integer('version').notNull().default(1),
    hoursVersion: integer('hours_version').notNull().default(1),
    ...times(),
  },
  (t) => [
    unique('staff_tenant_id').on(t.businessId, t.id),
    index('staff_list_idx').on(t.businessId, t.active, t.createdAt, t.id),
    check('staff_name', sql`char_length(trim(${t.displayName})) BETWEEN 2 AND 80`),
    check('staff_versions', sql`${t.version}>0 AND ${t.hoursVersion}>0`),
  ],
);
export const staffServices = appSchema.table(
  'staff_services',
  {
    businessId: uuid('business_id').notNull(),
    staffId: uuid('staff_id').notNull(),
    serviceId: uuid('service_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.businessId, t.staffId, t.serviceId] }),
    foreignKey({
      columns: [t.businessId, t.staffId],
      foreignColumns: [staffProfiles.businessId, staffProfiles.id],
    }),
    foreignKey({
      columns: [t.businessId, t.serviceId],
      foreignColumns: [services.businessId, services.id],
    }),
  ],
);
export const businessHours = appSchema.table(
  'business_hours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    weekday: integer('weekday').notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
  },
  (t) => [
    check(
      'business_hours_range',
      sql`${t.weekday} BETWEEN 0 AND 6 AND ${t.startMinute}>=0 AND ${t.endMinute}<=1440 AND ${t.startMinute}<${t.endMinute}`,
    ),
  ],
);
export const staffHours = appSchema.table(
  'staff_hours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id').notNull(),
    staffId: uuid('staff_id').notNull(),
    weekday: integer('weekday').notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.businessId, t.staffId],
      foreignColumns: [staffProfiles.businessId, staffProfiles.id],
    }),
    check(
      'staff_hours_range',
      sql`${t.weekday} BETWEEN 0 AND 6 AND ${t.startMinute}>=0 AND ${t.endMinute}<=1440 AND ${t.startMinute}<${t.endMinute}`,
    ),
  ],
);
export const scheduleExceptions = appSchema.table(
  'schedule_exceptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    staffId: uuid('staff_id'),
    localDate: date('local_date').notNull(),
    closed: boolean('closed').notNull(),
    version: integer('version').notNull().default(1),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...times(),
  },
  (t) => [
    unique('exception_tenant_id').on(t.businessId, t.id),
    foreignKey({
      columns: [t.businessId, t.staffId],
      foreignColumns: [staffProfiles.businessId, staffProfiles.id],
    }),
    uniqueIndex('salon_exception_day')
      .on(t.businessId, t.localDate)
      .where(sql`${t.staffId} IS NULL AND ${t.deletedAt} IS NULL`),
    uniqueIndex('staff_exception_day')
      .on(t.businessId, t.staffId, t.localDate)
      .where(sql`${t.staffId} IS NOT NULL AND ${t.deletedAt} IS NULL`),
    index('exception_dates_idx').on(t.businessId, t.localDate),
    check('exception_version', sql`${t.version}>0`),
  ],
);
export const exceptionIntervals = appSchema.table(
  'exception_intervals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id').notNull(),
    exceptionId: uuid('exception_id').notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.businessId, t.exceptionId],
      foreignColumns: [scheduleExceptions.businessId, scheduleExceptions.id],
    }),
    check(
      'exception_interval_range',
      sql`${t.startMinute}>=0 AND ${t.endMinute}<=1440 AND ${t.startMinute}<${t.endMinute}`,
    ),
  ],
);
export const managementWrites = appSchema.table(
  'management_writes',
  {
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    operation: text('operation').notNull(),
    key: text('key').notNull(),
    fingerprint: text('fingerprint').notNull(),
    response: jsonb('response'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    cacheExpiresAt: timestamp('cache_expires_at', { withTimezone: true })
      .notNull()
      .default(sql`now()+interval '7 days'`),
  },
  (t) => [primaryKey({ columns: [t.actorId, t.operation, t.key] })],
);
export const managementAudit = appSchema.table(
  'management_audit',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    action: text('action').notNull(),
    targetId: uuid('target_id'),
    requestId: text('request_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('management_audit_business_idx').on(t.businessId, t.occurredAt)],
);
