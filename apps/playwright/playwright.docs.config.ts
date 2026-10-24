import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Config used by the `screenshots:docs` script to regenerate documentation
 * screenshots. Identical to the base config, except the docs-screenshots
 * spec is not ignored (it is excluded from the default e2e run because it
 * rewrites committed screenshot assets).
 */
export default defineConfig({
  ...baseConfig,
  testIgnore: [],
});
