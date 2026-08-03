import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://uckg:uckg@localhost:5432/uckg_donations',
  },
  dialect: 'postgresql',
  out: './migrations',
  schema: './src/schema.ts',
});
