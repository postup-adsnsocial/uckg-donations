import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import type { PoolClient } from 'pg';

import { withPostgresTestHarness } from './postgres-test-harness.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectDatabaseError(
  action: () => Promise<unknown>,
  message: string,
  expectedCodes?: readonly string[],
): Promise<void> {
  try {
    await action();
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : undefined;
    if (expectedCodes && (!code || !expectedCodes.includes(code))) {
      throw new Error(
        `${message} Unexpected PostgreSQL code: ${code ?? 'none'}.`,
      );
    }
    return;
  }

  throw new Error(message);
}

async function withTenantTransaction<T>(
  pool: Pool,
  churchId: string,
  work: (client: PoolClient) => Promise<T>,
  rollback = false,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `select
         set_config('app.current_church_id', $1, true),
         set_config('app.current_actor_id', $2, true),
         set_config('app.correlation_id', $3, true)`,
      [churchId, randomUUID(), randomUUID()],
    );
    const result = await work(client);
    await client.query(rollback ? 'ROLLBACK' : 'COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

await withPostgresTestHarness(
  async ({ migratorPool, runtimeLogin, runtimeUrl }) => {
    const churches = await migratorPool.query<{ id: string; slug: string }>(
      `insert into churches (name, slug)
       values ('Church A', 'tenant-church-a'), ('Church B', 'tenant-church-b')
       returning id, slug`,
    );
    const churchA = churches.rows.find((row) => row.slug === 'tenant-church-a');
    const churchB = churches.rows.find((row) => row.slug === 'tenant-church-b');
    assert(churchA && churchB, 'Tenant fixtures were not created.');

    const members = await migratorPool.query<{
      church_id: string;
      full_name: string;
      id: string;
    }>(
      `insert into members (church_id, full_name)
       values ($1, 'Member A'), ($2, 'Member B')
       returning id, church_id, full_name`,
      [churchA.id, churchB.id],
    );
    const memberA = members.rows.find((row) => row.full_name === 'Member A');
    assert(memberA, 'Church A member fixture was not created.');

    await migratorPool.query(
      `create table tenant_member_links_test (
         church_id uuid not null,
         member_id uuid not null,
         constraint tenant_member_links_test_member_fk
           foreign key (church_id, member_id)
           references members (church_id, id)
       )`,
    );
    await migratorPool.query(
      'grant insert, select on tenant_member_links_test to uckg_runtime',
    );

    const runtimePool = new Pool({ connectionString: runtimeUrl, max: 1 });
    try {
      const identity = await runtimePool.query<{
        current_user: string;
        is_member: boolean;
        owns_members: boolean;
        rolbypassrls: boolean;
        rolcanlogin: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolreplication: boolean;
        rolsuper: boolean;
        rls_active: boolean;
      }>(
        `select current_user,
                pg_has_role(current_user, 'uckg_runtime', 'member') as is_member,
                r.rolbypassrls,
                r.rolcanlogin,
                r.rolcreatedb,
                r.rolcreaterole,
                r.rolreplication,
                r.rolsuper,
                c.relowner = r.oid as owns_members,
                row_security_active('members'::regclass) as rls_active
           from pg_roles r
           cross join pg_class c
           join pg_namespace n on n.oid = c.relnamespace
          where r.rolname = current_user
            and n.nspname = 'public'
            and c.relname = 'members'`,
      );
      const login = identity.rows[0];
      assert(
        login?.current_user === runtimeLogin,
        'Test did not use the real LOGIN role.',
      );
      assert(login.is_member, 'Runtime login is not a member of uckg_runtime.');
      assert(login.rolcanlogin, 'Generated runtime role cannot log in.');
      assert(
        !login.rolsuper &&
          !login.rolbypassrls &&
          !login.rolcreatedb &&
          !login.rolcreaterole &&
          !login.rolreplication,
        'Runtime login has prohibited role attributes.',
      );
      assert(!login.owns_members, 'Runtime login owns the members table.');
      assert(login.rls_active, 'RLS is not active for the runtime login.');

      const noContext = await runtimePool.query<{ count: string }>(
        'select count(*)::text as count from members',
      );
      assert(
        noContext.rows[0]?.count === '0',
        'No-context read exposed members.',
      );
      await expectDatabaseError(
        () =>
          runtimePool.query(
            `insert into members (church_id, full_name)
             values ($1, 'No context write')`,
            [churchA.id],
          ),
        'No-context member insert was accepted.',
        ['42501'],
      );

      await withTenantTransaction(runtimePool, churchA.id, async (client) => {
        const visible = await client.query<{ full_name: string }>(
          'select full_name from members order by full_name',
        );
        assert(
          visible.rows.map((row) => row.full_name).join(',') === 'Member A',
          'Church A did not see exactly its own member.',
        );
        const inserted = await client.query<{ id: string }>(
          `insert into members (church_id, full_name)
           values ($1, 'Member A runtime')
           returning id`,
          [churchA.id],
        );
        assert(inserted.rows[0]?.id, 'Church A runtime insert failed.');
        const updated = await client.query(
          `update members set phone = '+15555550101'
            where church_id = $1 and id = $2`,
          [churchA.id, inserted.rows[0].id],
        );
        assert(updated.rowCount === 1, 'Church A runtime update failed.');
      });

      await withTenantTransaction(runtimePool, churchB.id, async (client) => {
        const rawVisible = await client.query<{ church_id: string }>(
          'select church_id from members',
        );
        assert(
          rawVisible.rows.length === 1 &&
            rawVisible.rows[0]?.church_id === churchB.id,
          'Raw Church B query crossed the tenant boundary.',
        );
        const crossTenantUpdate = await client.query(
          `update members set phone = '+15555550102' where id = $1`,
          [memberA.id],
        );
        assert(
          crossTenantUpdate.rowCount === 0,
          'Church B updated a Church A member.',
        );
        await expectDatabaseError(
          () =>
            client.query(
              `insert into members (church_id, full_name)
               values ($1, 'Church A through B')`,
              [churchA.id],
            ),
          'Church B inserted a Church A member.',
          ['42501'],
        );
      });

      await withTenantTransaction(runtimePool, churchB.id, async (client) => {
        await expectDatabaseError(
          () =>
            client.query(
              `insert into tenant_member_links_test (church_id, member_id)
               values ($1, $2)`,
              [churchB.id, memberA.id],
            ),
          'Cross-tenant composite FK rejection did not occur.',
          ['23503'],
        );
      });

      for (let iteration = 0; iteration < 25; iteration += 1) {
        await withTenantTransaction(runtimePool, churchA.id, async (client) => {
          const result = await client.query<{ count: string }>(
            'select count(*)::text as count from members',
          );
          assert(
            result.rows[0]?.count === '2',
            `Church A cycle ${iteration} leaked.`,
          );
        });
        await withTenantTransaction(runtimePool, churchB.id, async (client) => {
          const result = await client.query<{ count: string }>(
            'select count(*)::text as count from members',
          );
          assert(
            result.rows[0]?.count === '1',
            `Church B cycle ${iteration} leaked.`,
          );
        });
        const none = await runtimePool.query<{ count: string }>(
          'select count(*)::text as count from members',
        );
        assert(
          none.rows[0]?.count === '0',
          `No-context cycle ${iteration} leaked.`,
        );
        await withTenantTransaction(
          runtimePool,
          churchA.id,
          async (client) => {
            const result = await client.query<{ count: string }>(
              'select count(*)::text as count from members',
            );
            assert(
              result.rows[0]?.count === '2',
              `Rollback cycle ${iteration} leaked.`,
            );
          },
          true,
        );
      }

      await expectDatabaseError(
        async () => {
          const client = await runtimePool.connect();
          try {
            await client.query('BEGIN');
            await client.query('SET LOCAL row_security = off');
            await client.query('select * from members');
          } finally {
            await client.query('ROLLBACK');
            client.release();
          }
        },
        'row_security = off bypassed forced RLS.',
        ['42501'],
      );
      await expectDatabaseError(
        () => runtimePool.query('TRUNCATE members'),
        'Runtime login could TRUNCATE members.',
        ['42501'],
      );
      await expectDatabaseError(
        () => runtimePool.query('CREATE TABLE runtime_forbidden (id integer)'),
        'Runtime login could CREATE in the public schema.',
        ['42501'],
      );
      await expectDatabaseError(
        () =>
          runtimePool.query(
            'ALTER POLICY members_tenant_isolation ON members USING (true)',
          ),
        'Runtime login could alter tenant policy.',
        ['42501'],
      );
      await expectDatabaseError(
        () => runtimePool.query('select * from drizzle.__drizzle_migrations'),
        'Runtime login could read the migration journal.',
        ['42501'],
      );

      console.info(
        'Tenant isolation test passed with the real runtime LOGIN role.',
      );
    } finally {
      await runtimePool.end();
    }
  },
  { provisionRuntimeLogin: true },
);
