import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

export interface DatabasePoolOptions {
  readonly applicationName?: string;
  readonly connectionTimeoutMs?: number;
  readonly idleTimeoutMs?: number;
  readonly max?: number;
  readonly statementTimeoutMs?: number;
}

export function createDatabase(
  databaseUrl: string,
  options: DatabasePoolOptions = {},
) {
  const pool = new Pool({
    application_name: options.applicationName,
    connectionString: databaseUrl,
    connectionTimeoutMillis: options.connectionTimeoutMs,
    idleTimeoutMillis: options.idleTimeoutMs,
    max: options.max,
    query_timeout: options.statementTimeoutMs,
    statement_timeout: options.statementTimeoutMs,
  });
  const database = drizzle(pool, { schema });

  return { database, pool };
}

export { schema };
export type Database = NodePgDatabase<typeof schema>;
