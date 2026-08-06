import { hashPassword, type ChurchRole } from '@uckg/authorization';
import { createDatabase, schema } from '@uckg/database';
import { eq, sql } from 'drizzle-orm';

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://uckg:uckg@localhost:5432/uckg_donations';
const churchName = requiredEnvironmentVariable('SEED_CHURCH_NAME');
const churchSlug = requiredEnvironmentVariable('SEED_CHURCH_SLUG');
const adminEmail =
  requiredEnvironmentVariable('SEED_ADMIN_EMAIL').toLowerCase();
const adminDisplayName = requiredEnvironmentVariable('SEED_ADMIN_DISPLAY_NAME');
const adminPassword = requiredEnvironmentVariable('SEED_ADMIN_PASSWORD');
const role = (process.env.SEED_ADMIN_ROLE ?? 'church_admin') as ChurchRole;

if (!['church_admin', 'financial_operator', 'auditor'].includes(role)) {
  throw new Error(
    'SEED_ADMIN_ROLE must be church_admin, financial_operator, or auditor.',
  );
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(churchSlug)) {
  throw new Error('SEED_CHURCH_SLUG must be a lowercase URL-safe slug.');
}

const passwordHash = await hashPassword(adminPassword);
const { database, pool } = createDatabase(databaseUrl);

try {
  const result = await database.transaction(async (transaction) => {
    let [church] = await transaction
      .select({ id: schema.churches.id })
      .from(schema.churches)
      .where(eq(schema.churches.slug, churchSlug))
      .limit(1);

    if (!church) {
      [church] = await transaction
        .insert(schema.churches)
        .values({ name: churchName, slug: churchSlug })
        .returning({ id: schema.churches.id });
    } else {
      await transaction
        .update(schema.churches)
        .set({ name: churchName, status: 'active', updatedAt: new Date() })
        .where(eq(schema.churches.id, church.id));
    }

    let [user] = await transaction
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .where(sql`lower(${schema.adminUsers.email}) = ${adminEmail}`)
      .limit(1);

    if (!user) {
      [user] = await transaction
        .insert(schema.adminUsers)
        .values({
          displayName: adminDisplayName,
          email: adminEmail,
          passwordHash,
        })
        .returning({ id: schema.adminUsers.id });
    } else {
      await transaction
        .update(schema.adminUsers)
        .set({
          displayName: adminDisplayName,
          passwordHash,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(schema.adminUsers.id, user.id));
    }

    if (!church || !user) {
      throw new Error(
        'Unable to create the bootstrap church and administrator.',
      );
    }

    await transaction
      .insert(schema.churchMemberships)
      .values({ churchId: church.id, role, userId: user.id })
      .onConflictDoUpdate({
        set: { role, updatedAt: new Date() },
        target: [
          schema.churchMemberships.churchId,
          schema.churchMemberships.userId,
        ],
      });

    return { churchId: church.id, userId: user.id };
  });

  console.info(
    `Bootstrap complete for church ${result.churchId} and administrator ${result.userId}.`,
  );
} finally {
  await pool.end();
}
