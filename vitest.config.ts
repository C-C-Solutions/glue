import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest configuration for all packages
 * Sets passWithNoTests to true to allow packages without test files to pass CI
 */
export default defineConfig({
  test: {
    passWithNoTests: true,
  },
});
