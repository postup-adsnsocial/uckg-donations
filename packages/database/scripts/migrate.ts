import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';

import { createDatabase } from '../src/index.js';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://uckg:uckg@localhost:5432/uckg_donations';
const migrationsFolder = fileURLToPath(
  new URL('../migrations', import.meta.url),
);
const { database, pool } = createDatabase(databaseUrl);

try {
  await migrate(database, { migrationsFolder });
  console.info('Database migrations applied successfully.');
} finally {
  await pool.end();
}
