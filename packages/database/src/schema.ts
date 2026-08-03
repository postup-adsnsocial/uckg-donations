import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const churchStatus = pgEnum('church_status', [
  'active',
  'suspended',
  'archived',
]);
export const adminUserStatus = pgEnum('admin_user_status', [
  'active',
  'disabled',
]);
export const churchRole = pgEnum('church_role', [
  'church_admin',
  'financial_operator',
  'auditor',
]);
export const memberStatus = pgEnum('member_status', ['active', 'inactive']);

export const churches = pgTable(
  'churches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    locale: text('locale').notNull().default('pt-BR'),
    timezone: text('timezone').notNull().default('America/Sao_Paulo'),
    addressLine1: text('address_line_1'),
    addressLine2: text('address_line_2'),
    city: text('city'),
    region: text('region'),
    postalCode: text('postal_code'),
    country: text('country').notNull().default('US'),
    phone: text('phone'),
    email: text('email'),
    status: churchStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('churches_slug_unique').on(table.slug),
    check(
      'churches_slug_format',
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check('churches_name_not_blank', sql`length(trim(${table.name})) > 0`),
  ],
);

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
    status: adminUserStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('admin_users_email_unique').on(sql`lower(${table.email})`),
    check(
      'admin_users_email_normalized',
      sql`${table.email} = lower(${table.email})`,
    ),
    check(
      'admin_users_display_name_not_blank',
      sql`length(trim(${table.displayName})) > 0`,
    ),
  ],
);

export const churchMemberships = pgTable(
  'church_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    role: churchRole('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('church_memberships_church_user_unique').on(
      table.churchId,
      table.userId,
    ),
    index('church_memberships_user_idx').on(table.userId),
  ],
);

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('admin_sessions_token_hash_unique').on(table.tokenHash),
    index('admin_sessions_user_idx').on(table.userId),
    index('admin_sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export const members = pgTable(
  'members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    addressLine1: text('address_line_1'),
    addressLine2: text('address_line_2'),
    city: text('city'),
    region: text('region'),
    postalCode: text('postal_code'),
    country: text('country').notNull().default('US'),
    notes: text('notes'),
    status: memberStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('members_church_id_id_unique').on(table.churchId, table.id),
    index('members_church_name_idx').on(table.churchId, table.fullName),
    uniqueIndex('members_church_email_unique')
      .on(table.churchId, sql`lower(${table.email})`)
      .where(sql`${table.email} is not null`),
    check(
      'members_full_name_not_blank',
      sql`length(trim(${table.fullName})) > 0`,
    ),
    check(
      'members_email_normalized',
      sql`${table.email} is null or ${table.email} = lower(${table.email})`,
    ),
    check(
      'members_phone_e164',
      sql`${table.phone} is null or ${table.phone} ~ '^\\+[1-9][0-9]{7,14}$'`,
    ),
  ],
);

export const donations = pgTable(
  'donations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id'),
    amountCents: integer('amount_cents').notNull(),
    receivedOn: date('received_on').notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('donations_church_id_id_unique').on(table.churchId, table.id),
    foreignKey({
      columns: [table.churchId, table.memberId],
      foreignColumns: [members.churchId, members.id],
      name: 'donations_church_member_fk',
    }).onDelete('restrict'),
    index('donations_church_received_idx').on(table.churchId, table.receivedOn),
    check('donations_amount_positive', sql`${table.amountCents} > 0`),
    check(
      'donations_notes_not_blank',
      sql`${table.notes} is null or length(trim(${table.notes})) > 0`,
    ),
  ],
);

export const envelopeFiles = pgTable(
  'envelope_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id, { onDelete: 'cascade' }),
    donationId: uuid('donation_id').notNull(),
    originalName: text('original_name').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    storageKey: text('storage_key').notNull(),
    checksum: text('checksum').notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.churchId, table.donationId],
      foreignColumns: [donations.churchId, donations.id],
      name: 'envelope_files_church_donation_fk',
    }).onDelete('cascade'),
    uniqueIndex('envelope_files_donation_unique').on(
      table.churchId,
      table.donationId,
    ),
    uniqueIndex('envelope_files_storage_key_unique').on(table.storageKey),
    check('envelope_files_size_positive', sql`${table.sizeBytes} > 0`),
  ],
);

export const reportFiles = pgTable(
  'report_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id, { onDelete: 'cascade' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    envelopeCount: integer('envelope_count').notNull(),
    totalCents: integer('total_cents').notNull(),
    storageKey: text('storage_key').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('report_files_church_created_idx').on(
      table.churchId,
      table.createdAt,
    ),
    uniqueIndex('report_files_storage_key_unique').on(table.storageKey),
    check(
      'report_files_period_valid',
      sql`${table.startDate} <= ${table.endDate}`,
    ),
    check('report_files_count_valid', sql`${table.envelopeCount} >= 0`),
    check('report_files_total_valid', sql`${table.totalCents} >= 0`),
  ],
);

export type Church = typeof churches.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type ChurchMembership = typeof churchMemberships.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Donation = typeof donations.$inferSelect;
export type EnvelopeFile = typeof envelopeFiles.$inferSelect;
export type ReportFile = typeof reportFiles.$inferSelect;
