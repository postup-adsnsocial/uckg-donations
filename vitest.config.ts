import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@uckg/authorization': fileURLToPath(
        new URL('./packages/authorization/src/index.ts', import.meta.url),
      ),
      '@uckg/contracts': fileURLToPath(
        new URL('./packages/contracts/src/index.ts', import.meta.url),
      ),
      '@uckg/database': fileURLToPath(
        new URL('./packages/database/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    include: ['apps/**/*.spec.ts', 'packages/**/*.spec.ts'],
    passWithNoTests: false,
  },
});
