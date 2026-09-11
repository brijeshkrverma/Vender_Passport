import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    exclude: ['node_modules', 'frontend-react/tests', 'tests/e2e'],
    globals: false,
    environment: 'node',
  },
});
