import { Pool } from 'pg';

import {
  type PostgresTestHarness,
  withPostgresTestHarness,
} from './postgres-test-harness.js';

async function testMigrations({
  migratorPool,
  runtimeUrl,
}: PostgresTestHarness) {
  const result = await migratorPool.query<{ table_name: string }>(
    `select table_name
       from information_schema.tables
      where table_schema = 'public'
        and table_name in ('churches', 'admin_users', 'church_memberships', 'admin_sessions', 'members', 'donations', 'envelope_files')
      order by table_name`,
  );

  const tables = result.rows.map((row) => row.table_name);
  const expectedTables = [
    'admin_sessions',
    'admin_users',
    'church_memberships',
    'churches',
    'donations',
    'envelope_files',
    'members',
  ];

  if (JSON.stringify(tables) !== JSON.stringify(expectedTables)) {
    throw new Error(`Unexpected migrated tables: ${tables.join(', ')}`);
  }

  const role = await migratorPool.query<{
    rolbypassrls: boolean;
    rolcanlogin: boolean;
    rolcreatedb: boolean;
    rolcreaterole: boolean;
    rolreplication: boolean;
    rolsuper: boolean;
  }>(
    `select rolbypassrls, rolcanlogin, rolcreatedb, rolcreaterole,
            rolreplication, rolsuper
       from pg_roles
      where rolname = 'uckg_runtime'`,
  );
  const runtimeRole = role.rows[0];
  if (
    !runtimeRole ||
    runtimeRole.rolbypassrls ||
    runtimeRole.rolcanlogin ||
    runtimeRole.rolcreatedb ||
    runtimeRole.rolcreaterole ||
    runtimeRole.rolreplication ||
    runtimeRole.rolsuper
  ) {
    throw new Error('uckg_runtime does not have the expected safe attributes.');
  }

  const tableSecurity = await migratorPool.query<{
    relforcerowsecurity: boolean;
    relrowsecurity: boolean;
    runtime_owns_table: boolean;
  }>(
    `select c.relforcerowsecurity,
            c.relrowsecurity,
            c.relowner = (select oid from pg_roles where rolname = 'uckg_runtime') as runtime_owns_table
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'members'`,
  );
  const membersSecurity = tableSecurity.rows[0];
  if (
    !membersSecurity?.relrowsecurity ||
    !membersSecurity.relforcerowsecurity ||
    membersSecurity.runtime_owns_table
  ) {
    throw new Error('members must use forced RLS and remain migrator-owned.');
  }

  const policy = await migratorPool.query<{
    cmd: string;
    qual: string | null;
    roles: string[];
    with_check: string | null;
  }>(
    `select cmd, qual, roles, with_check
       from pg_policies
      where schemaname = 'public'
        and tablename = 'members'
        and policyname = 'members_tenant_isolation'`,
  );
  const tenantPolicy = policy.rows[0];
  const expectedSetting =
    "NULLIF(current_setting('app.current_church_id'::text, true), ''::text)";
  if (
    tenantPolicy?.cmd !== 'ALL' ||
    !tenantPolicy.roles.includes('uckg_runtime') ||
    !tenantPolicy.qual?.includes(expectedSetting) ||
    !tenantPolicy.with_check?.includes(expectedSetting) ||
    tenantPolicy.qual !== tenantPolicy.with_check
  ) {
    throw new Error('members tenant policy is missing or inconsistent.');
  }

  const candidateKey = await migratorPool.query<{ exists: boolean }>(
    `select exists (
       select 1
         from pg_constraint
        where conrelid = 'public.members'::regclass
          and conname = 'members_church_id_id_unique'
          and contype = 'u'
          and pg_get_constraintdef(oid) = 'UNIQUE (church_id, id)'
     ) as exists`,
  );
  if (!candidateKey.rows[0]?.exists) {
    throw new Error('members composite candidate key is missing.');
  }

  const privileges = await migratorPool.query<{
    admin_sessions_delete: boolean;
    admin_sessions_insert: boolean;
    admin_sessions_select: boolean;
    admin_sessions_update: boolean;
    churches_delete: boolean;
    churches_insert: boolean;
    churches_update: boolean;
    members_delete: boolean;
    members_insert: boolean;
    members_references: boolean;
    members_select: boolean;
    members_truncate: boolean;
    members_update: boolean;
    migration_schema_usage: boolean;
    migration_table_select: boolean;
    schema_create: boolean;
    schema_usage: boolean;
  }>(
    `select
       has_schema_privilege('uckg_runtime', 'public', 'USAGE') as schema_usage,
       has_schema_privilege('uckg_runtime', 'public', 'CREATE') as schema_create,
       has_table_privilege('uckg_runtime', 'admin_sessions', 'SELECT') as admin_sessions_select,
       has_table_privilege('uckg_runtime', 'admin_sessions', 'INSERT') as admin_sessions_insert,
       has_table_privilege('uckg_runtime', 'admin_sessions', 'UPDATE') as admin_sessions_update,
       has_table_privilege('uckg_runtime', 'admin_sessions', 'DELETE') as admin_sessions_delete,
       has_table_privilege('uckg_runtime', 'churches', 'INSERT') as churches_insert,
       has_table_privilege('uckg_runtime', 'churches', 'UPDATE') as churches_update,
       has_table_privilege('uckg_runtime', 'churches', 'DELETE') as churches_delete,
       has_table_privilege('uckg_runtime', 'members', 'SELECT') as members_select,
       has_table_privilege('uckg_runtime', 'members', 'INSERT') as members_insert,
       has_table_privilege('uckg_runtime', 'members', 'UPDATE') as members_update,
       has_table_privilege('uckg_runtime', 'members', 'DELETE') as members_delete,
       has_table_privilege('uckg_runtime', 'members', 'TRUNCATE') as members_truncate,
       has_table_privilege('uckg_runtime', 'members', 'REFERENCES') as members_references,
       has_schema_privilege('uckg_runtime', 'drizzle', 'USAGE') as migration_schema_usage,
       has_table_privilege('uckg_runtime', 'drizzle.__drizzle_migrations', 'SELECT') as migration_table_select`,
  );
  const runtimePrivileges = privileges.rows[0];
  if (
    !runtimePrivileges?.schema_usage ||
    runtimePrivileges.schema_create ||
    !runtimePrivileges.admin_sessions_select ||
    !runtimePrivileges.admin_sessions_insert ||
    !runtimePrivileges.admin_sessions_update ||
    !runtimePrivileges.admin_sessions_delete ||
    !runtimePrivileges.churches_insert ||
    !runtimePrivileges.churches_update ||
    runtimePrivileges.churches_delete ||
    !runtimePrivileges.members_select ||
    !runtimePrivileges.members_insert ||
    !runtimePrivileges.members_update ||
    runtimePrivileges.members_delete ||
    runtimePrivileges.members_truncate ||
    runtimePrivileges.members_references ||
    runtimePrivileges.migration_schema_usage ||
    runtimePrivileges.migration_table_select
  ) {
    throw new Error(
      'uckg_runtime table or schema grants are not least privilege.',
    );
  }

  const controlPlane = await migratorPool.query<{ allowed: boolean }>(
    `select bool_and(has_table_privilege('uckg_runtime', table_name, 'SELECT')) as allowed
       from (values ('churches'), ('admin_users'), ('church_memberships')) as tables(table_name)`,
  );
  if (!controlPlane.rows[0]?.allowed) {
    throw new Error('uckg_runtime lacks minimum control-plane reads.');
  }

  const testChurch = await migratorPool.query<{ id: string }>(
    `insert into churches (name, slug)
     values ('Runtime update test', 'runtime-update-test')
     returning id`,
  );
  const runtimePool = new Pool({ connectionString: runtimeUrl, max: 1 });

  try {
    const updated = await runtimePool.query(
      `update churches
          set name = 'Runtime update confirmed'
        where id = $1`,
      [testChurch.rows[0]?.id],
    );
    if (updated.rowCount !== 1) {
      throw new Error('uckg_runtime could not update a church.');
    }
  } finally {
    await runtimePool.end();
  }

  console.info(`Migration test passed with tables: ${tables.join(', ')}.`);
}

await withPostgresTestHarness(testMigrations, {
  provisionRuntimeLogin: true,
});
