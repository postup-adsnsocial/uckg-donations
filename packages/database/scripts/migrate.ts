import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';

import { createDatabase } from '../src/index.js';

const databaseUrl = process.env.MIGRATION_DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('MIGRATION_DATABASE_URL is required to run migrations.');
}
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
