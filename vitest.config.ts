import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@anygrab/core': resolve(rootDir, 'packages/core/src/index.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    passWithNoTests: true,
    include: [
      'packages/**/*.test.ts',
      'apps/**/*.test.{ts,tsx}',
      'benchmarks/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
