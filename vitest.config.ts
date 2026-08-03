import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    include: ['apps/**/*.spec.ts', 'packages/**/*.spec.ts'],
    passWithNoTests: false,
  },
});
