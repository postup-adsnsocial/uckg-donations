import { Pool } from 'pg';

import { withPostgresTestHarness } from './postgres-test-harness.js';

await withPostgresTestHarness(
  async ({ migratorPool, runtimeUrl }) => {
    const church = await migratorPool.query<{ id: string }>(
      `insert into churches (name, slug)
     values ('Tenant isolation fixture', 'tenant-isolation-fixture')
     returning id`,
    );
    await migratorPool.query(
      `insert into members (church_id, full_name)
     values ($1, 'Protected member')`,
      [church.rows[0]?.id],
    );

    const runtimePool = new Pool({ connectionString: runtimeUrl, max: 1 });
    try {
      const visible = await runtimePool.query<{ count: string }>(
        'select count(*)::text as count from members',
      );
      if (visible.rows[0]?.count !== '0') {
        throw new Error(
          'Runtime login can read members without tenant context.',
        );
      }
    } finally {
      await runtimePool.end();
    }
  },
  { provisionRuntimeLogin: true },
);
