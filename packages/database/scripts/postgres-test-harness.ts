import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

import { createDatabase } from '../src/index.js';

const localMigrationDatabaseUrl =
  'postgresql://uckg:uckg@localhost:5432/uckg_donations';

export interface PostgresTestHarness {
  databaseName: string;
  databaseUrl: string;
  migratorPool: Pool;
  runtimeLogin: string;
  runtimeUrl: string;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function configuredMigrationUrl(): URL {
  const value = process.env.MIGRATION_DATABASE_URL?.trim();
  return new URL(value || localMigrationDatabaseUrl);
}

export async function withPostgresTestHarness<T>(
  work: (harness: PostgresTestHarness) => Promise<T>,
  options: { provisionRuntimeLogin?: boolean } = {},
): Promise<T> {
  const suffix = `${Date.now()}_${randomBytes(4).toString('hex')}`;
  const databaseName = `uckg_test_${suffix}`;
  const runtimeLogin = `uckg_test_login_${suffix}`;
  const runtimePassword = randomBytes(24).toString('base64url');
  const configuredUrl = configuredMigrationUrl();
  const adminUrl = new URL(configuredUrl);
  adminUrl.pathname = '/postgres';
  const databaseUrl = new URL(configuredUrl);
  databaseUrl.pathname = `/${databaseName}`;
  const runtimeUrl = new URL(databaseUrl);
  runtimeUrl.username = runtimeLogin;
  runtimeUrl.password = runtimePassword;

  const adminPool = new Pool({ connectionString: adminUrl.toString() });
  let migratorPool: Pool | undefined;

  try {
    await adminPool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);

    const connection = createDatabase(databaseUrl.toString());
    migratorPool = connection.pool;
    const migrationsFolder = fileURLToPath(
      new URL('../migrations', import.meta.url),
    );
    await migrate(connection.database, { migrationsFolder });

    if (options.provisionRuntimeLogin) {
      await adminPool.query(
        `CREATE ROLE ${quoteIdentifier(runtimeLogin)} LOGIN PASSWORD ${quoteLiteral(runtimePassword)}
         NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION NOBYPASSRLS`,
      );
      await adminPool.query(
        `GRANT uckg_runtime TO ${quoteIdentifier(runtimeLogin)}`,
      );
    }

    return await work({
      databaseName,
      databaseUrl: databaseUrl.toString(),
      migratorPool,
      runtimeLogin,
      runtimeUrl: runtimeUrl.toString(),
    });
  } finally {
    await migratorPool?.end();
    await adminPool.query(
      `select pg_terminate_backend(pid)
         from pg_stat_activity
        where (datname = $1 or usename = $2)
          and pid <> pg_backend_pid()`,
      [databaseName, runtimeLogin],
    );
    await adminPool.query(
      `DROP ROLE IF EXISTS ${quoteIdentifier(runtimeLogin)}`,
    );
    await adminPool.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`,
    );
    await adminPool.end();
  }
}
