import { test as base, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const TEST_DATA_DIR = path.resolve(__dirname, '..', 'test-data');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'screenshots');
const DOC_SCREENSHOTS_DIR = path.resolve(__dirname, '..', '..', 'website', 'src', 'public', 'screenshots');
const README_IMAGES_DIR = path.resolve(__dirname, '..', '..', '..', 'images');

/** Local-only files that live in .requesto/ */
const LOCAL_FILES = [
  'history.json',
];

/**
 * Slug used for per-item data file names (mirrors backend utils/slug.ts).
 */
function slugify(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface OrderManifest {
  collections?: string[];
  environments?: string[];
  oauthConfigs?: string[];
  graphqlSchemas?: string[];
}

/**
 * Convert the monolithic fixture files into the split per-item layout:
 * one JSON file per collection/environment/oauth config/graphql schema,
 * plus an order.json manifest preserving display order.
 */
function writeSplitData(requestoDir: string, localDir: string) {
  const order: OrderManifest = {};

  // Collections: one file per collection
  const collectionsFile = path.join(FIXTURES_DIR, 'collections.json');
  const collections: { id: string; name: string }[] = fs.existsSync(collectionsFile)
    ? JSON.parse(fs.readFileSync(collectionsFile, 'utf-8'))
    : [];
  const collectionsDir = path.join(requestoDir, 'collections');
  fs.mkdirSync(collectionsDir, { recursive: true });
  for (const collection of collections) {
    const fileName = `${slugify(collection.name) || collection.id}.json`;
    fs.writeFileSync(path.join(collectionsDir, fileName), JSON.stringify(collection, null, 2), 'utf-8');
  }
  order.collections = collections.map((c) => c.id);

  // Environments: one file per environment, active selection in local/
  const environmentsFile = path.join(FIXTURES_DIR, 'environments.json');
  const environmentsData = fs.existsSync(environmentsFile)
    ? JSON.parse(fs.readFileSync(environmentsFile, 'utf-8'))
    : { activeEnvironmentId: null, environments: [] };
  const environmentsDir = path.join(requestoDir, 'environments');
  fs.mkdirSync(environmentsDir, { recursive: true });
  for (const environment of environmentsData.environments ?? []) {
    const fileName = `${slugify(environment.name) || environment.id}.json`;
    fs.writeFileSync(path.join(environmentsDir, fileName), JSON.stringify(environment, null, 2), 'utf-8');
  }
  order.environments = (environmentsData.environments ?? []).map((e: { id: string }) => e.id);
  fs.writeFileSync(
    path.join(localDir, 'active-environment.json'),
    JSON.stringify({ activeEnvironmentId: environmentsData.activeEnvironmentId ?? null }, null, 2),
    'utf-8',
  );

  // OAuth configs: one file per config
  const oauthFile = path.join(FIXTURES_DIR, 'oauth-configs.json');
  const oauthData = fs.existsSync(oauthFile)
    ? JSON.parse(fs.readFileSync(oauthFile, 'utf-8'))
    : { configs: [] };
  const oauthDir = path.join(requestoDir, 'oauth-configs');
  fs.mkdirSync(oauthDir, { recursive: true });
  for (const config of oauthData.configs ?? []) {
    const fileName = `${slugify(config.name) || config.id}.json`;
    fs.writeFileSync(path.join(oauthDir, fileName), JSON.stringify(config, null, 2), 'utf-8');
  }
  order.oauthConfigs = (oauthData.configs ?? []).map((c: { id: string }) => c.id);

  // GraphQL schemas: one file per profile
  const graphqlFile = path.join(FIXTURES_DIR, 'graphql-schemas.json');
  const schemas: { id: string; name: string }[] = fs.existsSync(graphqlFile)
    ? JSON.parse(fs.readFileSync(graphqlFile, 'utf-8'))
    : [];
  const graphqlDir = path.join(requestoDir, 'graphql-schemas');
  fs.mkdirSync(graphqlDir, { recursive: true });
  for (const schema of schemas) {
    const fileName = `${slugify(schema.name) || schema.id}.json`;
    fs.writeFileSync(path.join(graphqlDir, fileName), JSON.stringify(schema, null, 2), 'utf-8');
  }
  order.graphqlSchemas = schemas.map((s) => s.id);

  fs.writeFileSync(path.join(requestoDir, 'order.json'), JSON.stringify(order, null, 2), 'utf-8');
}

/** Copy fresh fixture data into test-data directory (workspace-aware layout) */
function resetTestData() {
  // Create workspace directory (test-data IS the workspace directory)
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  // Recreate .requesto/ from scratch so stale per-item files never leak between runs
  const requestoDir = path.join(TEST_DATA_DIR, '.requesto');
  fs.rmSync(requestoDir, { recursive: true, force: true });
  fs.mkdirSync(requestoDir, { recursive: true });

  // Create .requesto/local/ directory for gitignored local-only data
  const localDir = path.join(requestoDir, 'local');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  // Split the monolithic fixtures into per-item data files
  writeSplitData(requestoDir, localDir);

  // Copy local-only files to .requesto/local/
  for (const file of LOCAL_FILES) {
    const src = path.join(FIXTURES_DIR, file);
    const dest = path.join(localDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  // Initialize oauth-secrets.json in .requesto/local/
  const secretsFile = path.join(localDir, 'oauth-secrets.json');
  if (!fs.existsSync(secretsFile)) {
    fs.writeFileSync(secretsFile, JSON.stringify({ secrets: {} }, null, 2), 'utf-8');
  }

  // Create workspaces.json registry pointing to test-data as Default workspace
  const workspacesFile = path.join(TEST_DATA_DIR, 'workspaces.json');
  const workspacesData = {
    activeWorkspaceId: 'ws-test-default',
    workspaces: [
      {
        id: 'ws-test-default',
        name: 'Default',
        path: TEST_DATA_DIR
      },
    ],
  };
  fs.writeFileSync(workspacesFile, JSON.stringify(workspacesData, null, 2), 'utf-8');
}

/** Ensure screenshots directory exists */
function ensureScreenshotDir(baseDir: string, category: string) {
  const dir = path.join(baseDir, category);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export type TestFixtures = {
  /** Take a categorised screenshot for documentation */
  takeScreenshot: (category: string, name: string) => Promise<void>;
  /** Take a screenshot destined for the website docs (apps/website/src/public/screenshots/) */
  takeDocScreenshot: (category: string, name: string) => Promise<void>;
  /** Take a screenshot for the repo README (images/) */
  takeReadmeScreenshot: (name: string) => Promise<void>;
  /** The test page, navigated to the app root */
  appPage: Page;
};

export const test = base.extend<TestFixtures>({
  takeScreenshot: async ({ page }, use, testInfo) => {
    const fn = async (category: string, name: string) => {
      ensureScreenshotDir(SCREENSHOTS_DIR, category);
      const filePath = path.join(SCREENSHOTS_DIR, category, `${name}.png`);
      const buffer = await page.screenshot({ path: filePath, fullPage: false });
      await testInfo.attach(`${category}/${name}`, {
        body: buffer,
        contentType: 'image/png',
      });
    };
    await use(fn);
  },

  takeDocScreenshot: async ({ page }, use, testInfo) => {
    const fn = async (category: string, name: string) => {
      // Determine current theme
      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      );
      const currentTheme = isDark ? 'dark' : 'light';
      const otherTheme = isDark ? 'light' : 'dark';

      // Take screenshot in current theme
      ensureScreenshotDir(DOC_SCREENSHOTS_DIR, `${currentTheme}/${category}`);
      let filePath = path.join(DOC_SCREENSHOTS_DIR, currentTheme, category, `${name}.png`);
      let buffer = await page.screenshot({ path: filePath, fullPage: false });
      await testInfo.attach(`docs/${currentTheme}/${category}/${name}`, {
        body: buffer,
        contentType: 'image/png',
      });

      // Toggle to other theme via DOM click (works even with dialog overlays)
      const toggleTitle = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
      await page.evaluate((title) => {
        const btn = document.querySelector(`button[title="${title}"]`) as HTMLElement;
        if (btn) btn.click();
      }, toggleTitle);
      await page.waitForTimeout(500);

      // Take screenshot in other theme
      ensureScreenshotDir(DOC_SCREENSHOTS_DIR, `${otherTheme}/${category}`);
      filePath = path.join(DOC_SCREENSHOTS_DIR, otherTheme, category, `${name}.png`);
      buffer = await page.screenshot({ path: filePath, fullPage: false });
      await testInfo.attach(`docs/${otherTheme}/${category}/${name}`, {
        body: buffer,
        contentType: 'image/png',
      });

      // Restore original theme
      const restoreTitle = isDark ? 'Switch to Dark Mode' : 'Switch to Light Mode';
      await page.evaluate((title) => {
        const btn = document.querySelector(`button[title="${title}"]`) as HTMLElement;
        if (btn) btn.click();
      }, restoreTitle);
      await page.waitForTimeout(300);
    };
    await use(fn);
  },

  takeReadmeScreenshot: async ({ page }, use, testInfo) => {
    const fn = async (name: string) => {
      if (!fs.existsSync(README_IMAGES_DIR)) {
        fs.mkdirSync(README_IMAGES_DIR, { recursive: true });
      }

      // Determine current theme
      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      );

      // Take screenshot in current theme
      const currentLabel = isDark ? 'dark' : 'light';
      let filePath = path.join(README_IMAGES_DIR, `${name}-${currentLabel}.png`);
      let buffer = await page.screenshot({ path: filePath, fullPage: false });
      await testInfo.attach(`readme/${name}-${currentLabel}`, {
        body: buffer,
        contentType: 'image/png',
      });

      // Toggle to other theme
      const otherLabel = isDark ? 'light' : 'dark';
      const toggleTitle = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
      await page.evaluate((title) => {
        const btn = document.querySelector(`button[title="${title}"]`) as HTMLElement;
        if (btn) btn.click();
      }, toggleTitle);
      await page.waitForTimeout(500);

      // Take screenshot in other theme
      filePath = path.join(README_IMAGES_DIR, `${name}-${otherLabel}.png`);
      buffer = await page.screenshot({ path: filePath, fullPage: false });
      await testInfo.attach(`readme/${name}-${otherLabel}`, {
        body: buffer,
        contentType: 'image/png',
      });

      // Restore original theme
      const restoreTitle = isDark ? 'Switch to Dark Mode' : 'Switch to Light Mode';
      await page.evaluate((title) => {
        const btn = document.querySelector(`button[title="${title}"]`) as HTMLElement;
        if (btn) btn.click();
      }, restoreTitle);
      await page.waitForTimeout(300);
    };
    await use(fn);
  },

  appPage: async ({ page }, use) => {
    // Navigate to the app and wait for it to be ready
    await page.goto('/');
    // Wait for the app to hydrate — sidebar title "Collections" is always visible
    await page.waitForSelector('text=Collections', { timeout: 15_000 });
    // Wait for collections data to load from the API
    await page.waitForSelector('text=Sample API', { timeout: 10_000 });
    await use(page);
  },
});

/** Reset test data before a test file runs */
export function resetData() {
  resetTestData();
}

export { expect } from '@playwright/test';
