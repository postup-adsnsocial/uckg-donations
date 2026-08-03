import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

import { createDatabase } from '../src/index.js';

const configuredUrl = new URL(
  process.env.DATABASE_URL ??
    'postgresql://uckg:uckg@localhost:5432/uckg_donations',
);
const adminUrl = new URL(configuredUrl);
adminUrl.pathname = '/postgres';

const databaseName = `uckg_migration_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
const testUrl = new URL(configuredUrl);
testUrl.pathname = `/${databaseName}`;

const adminPool = new Pool({ connectionString: adminUrl.toString() });
let testPool: Pool | undefined;

try {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);

  const connection = createDatabase(testUrl.toString());
  testPool = connection.pool;
  const migrationsFolder = fileURLToPath(
    new URL('../migrations', import.meta.url),
  );

  await migrate(connection.database, { migrationsFolder });

  const result = await testPool.query<{ table_name: string }>(
    `select table_name
       from information_schema.tables
      where table_schema = 'public'
        and table_name in ('churches', 'admin_users', 'church_memberships', 'admin_sessions')
      order by table_name`,
  );

  const tables = result.rows.map((row) => row.table_name);
  const expectedTables = [
    'admin_sessions',
    'admin_users',
    'church_memberships',
    'churches',
  ];

  if (JSON.stringify(tables) !== JSON.stringify(expectedTables)) {
    throw new Error(`Unexpected migrated tables: ${tables.join(', ')}`);
  }

  console.info(`Migration test passed with tables: ${tables.join(', ')}.`);
} finally {
  await testPool?.end();
  await adminPool.query(
    `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
    [databaseName],
  );
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
}
