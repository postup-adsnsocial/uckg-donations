import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

export const churches = pgTable(
  'churches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    locale: text('locale').notNull().default('pt-BR'),
    timezone: text('timezone').notNull().default('America/Sao_Paulo'),
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

export type Church = typeof churches.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type ChurchMembership = typeof churchMemberships.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
