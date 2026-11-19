import { sql } from 'drizzle-orm';
import {
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  foreignKey,
  unique,
  index,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';
import { appSchema } from '../../../../database/app-schema.js';
import { users } from '../../../identity/persistence-schema.js';
import {
  businesses,
  services,
  staffProfiles,
} from '../../../salon-management/persistence-schema.js';
import type { BookingSnapshot } from '../../domain/booking.types.js';
const instant = (name: string) => timestamp(name, { withTimezone: true });
export const appointments = appSchema.table(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    serviceId: uuid('service_id').notNull(),
    staffId: uuid('staff_id').notNull(),
    bookingUserId: uuid('booking_user_id').references(() => users.id),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    code: text('code').notNull().unique(),
    source: text('source').notNull(),
    status: text('status').notNull().default('confirmed'),
    version: integer('version').notNull().default(1),
    startsAt: instant('starts_at').notNull(),
    endsAt: instant('ends_at').notNull(),
    snapshot: jsonb('snapshot').$type<BookingSnapshot>().notNull(),
    cancellationReason: text('cancellation_reason'),
    cancelledAt: instant('cancelled_at'),
    noticeOverrideReason: text('notice_override_reason'),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (t) => [
    unique('appointment_tenant_id').on(t.businessId, t.staffId, t.id),
    foreignKey({
      columns: [t.businessId, t.serviceId],
      foreignColumns: [services.businessId, services.id],
    }),
    foreignKey({
      columns: [t.businessId, t.staffId],
      foreignColumns: [staffProfiles.businessId, staffProfiles.id],
    }),
    index('appointments_agenda_idx').on(t.businessId, t.startsAt, t.id),
    index('appointments_customer_idx').on(t.bookingUserId, t.startsAt, t.id),
    index('appointments_active_idx')
      .on(t.businessId, t.staffId, t.startsAt)
      .where(sql`${t.status}='confirmed'`),
    check(
      'appointment_state',
      sql`${t.status} IN ('confirmed','cancelled','completed','no_show') AND ${t.source} IN ('online','manual') AND ${t.version}>0 AND ${t.endsAt}>${t.startsAt}`,
    ),
    check(
      'appointment_customer',
      sql`(${t.source}='online' AND ${t.bookingUserId}=${t.createdBy}) OR (${t.source}='manual' AND ${t.bookingUserId} IS NULL)`,
    ),
    check(
      'appointment_cancellation',
      sql`(${t.status}='cancelled' AND ${t.cancelledAt} IS NOT NULL AND char_length(trim(${t.cancellationReason})) BETWEEN 3 AND 300) OR (${t.status}<>'cancelled' AND ${t.cancelledAt} IS NULL AND ${t.cancellationReason} IS NULL)`,
    ),
  ],
);
export const scheduleBlocks = appSchema.table(
  'schedule_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    staffId: uuid('staff_id').notNull(),
    staffName: text('staff_name').notNull(),
    startsAt: instant('starts_at').notNull(),
    endsAt: instant('ends_at').notNull(),
    reason: text('reason').notNull(),
    version: integer('version').notNull().default(1),
    releasedAt: instant('released_at'),
    releaseReason: text('release_reason'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    releasedBy: uuid('released_by').references(() => users.id),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (t) => [
    unique('block_tenant_id').on(t.businessId, t.staffId, t.id),
    foreignKey({
      columns: [t.businessId, t.staffId],
      foreignColumns: [staffProfiles.businessId, staffProfiles.id],
    }),
    check(
      'block_valid',
      sql`${t.endsAt}>${t.startsAt} AND ${t.endsAt}<=${t.startsAt}+interval '24 hours' AND char_length(trim(${t.reason})) BETWEEN 3 AND 300 AND ${t.version}>0`,
    ),
    check(
      'block_release',
      sql`(${t.releasedAt} IS NULL AND ${t.releaseReason} IS NULL AND ${t.releasedBy} IS NULL AND ${t.version}=1) OR (${t.releasedAt} IS NOT NULL AND ${t.releaseReason} IS NOT NULL AND char_length(trim(${t.releaseReason})) BETWEEN 3 AND 300 AND ${t.releasedBy} IS NOT NULL AND ${t.version}=2)`,
    ),
    index('blocks_agenda_idx').on(t.businessId, t.startsAt, t.id),
  ],
);
export const scheduleAllocations = appSchema.table(
  'schedule_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    appointmentId: uuid('appointment_id').unique(),
    blockId: uuid('block_id').unique(),
    businessId: uuid('business_id').notNull(),
    staffId: uuid('staff_id').notNull(),
    occupiedStart: instant('occupied_start').notNull(),
    occupiedEnd: instant('occupied_end').notNull(),
    releasedAt: instant('released_at'),
  },
  (t) => [
    foreignKey({
      columns: [t.businessId, t.staffId, t.appointmentId],
      foreignColumns: [appointments.businessId, appointments.staffId, appointments.id],
    }),
    foreignKey({
      columns: [t.businessId, t.staffId, t.blockId],
      foreignColumns: [scheduleBlocks.businessId, scheduleBlocks.staffId, scheduleBlocks.id],
    }),
    check(
      'allocation_source',
      sql`(${t.appointmentId} IS NOT NULL)::integer+(${t.blockId} IS NOT NULL)::integer=1`,
    ),
    check('allocation_range', sql`${t.occupiedStart}<${t.occupiedEnd}`),
  ],
);
export const bookingEvents = appSchema.table(
  'booking_events',
  {
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id),
    version: integer('version').notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    reason: text('reason'),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: instant('occurred_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.appointmentId, t.version] }),
    check(
      'booking_event_action',
      sql`${t.action} IN ('created','cancelled','rescheduled','outcome','corrected')`,
    ),
  ],
);
export const bookingWrites = appSchema.table(
  'booking_writes',
  {
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    operation: text('operation').notNull(),
    key: text('key').notNull(),
    fingerprint: text('fingerprint').notNull(),
    appointmentId: uuid('appointment_id').references(() => appointments.id),
    blockId: uuid('block_id').references(() => scheduleBlocks.id),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.actorId, t.operation, t.key] }),
    check(
      'booking_write_source',
      sql`(${t.appointmentId} IS NOT NULL)::integer+(${t.blockId} IS NOT NULL)::integer=1`,
    ),
  ],
);
