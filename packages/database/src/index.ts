import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

export function createDatabase(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  const database = drizzle(pool, { schema });

  return { database, pool };
}

export { schema };
export type Database = NodePgDatabase<typeof schema>;
