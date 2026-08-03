import { withPostgresTestHarness } from './postgres-test-harness.js';

await withPostgresTestHarness(async ({ migratorPool }) => {
  const result = await migratorPool.query<{ table_name: string }>(
    `select table_name
       from information_schema.tables
      where table_schema = 'public'
        and table_name in ('churches', 'admin_users', 'church_memberships', 'admin_sessions', 'members')
      order by table_name`,
  );

  const tables = result.rows.map((row) => row.table_name);
  const expectedTables = [
    'admin_sessions',
    'admin_users',
    'church_memberships',
    'churches',
    'members',
  ];

  if (JSON.stringify(tables) !== JSON.stringify(expectedTables)) {
    throw new Error(`Unexpected migrated tables: ${tables.join(', ')}`);
  }

  console.info(`Migration test passed with tables: ${tables.join(', ')}.`);
});
