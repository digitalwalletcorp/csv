import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  test: {
    environment: 'node',
    include: [
      'test/specs/**/*.spec.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: [
        'lcov',
        'text-summary'
      ],
      reportsDirectory: 'test/coverage',
      include: [
        'src/**'
      ]
    }
  }
});
