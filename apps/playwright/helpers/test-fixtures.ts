import { test as base, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const TEST_DATA_DIR = path.resolve(__dirname, '..', 'test-data');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'screenshots');

const FIXTURE_FILES = [
  'collections.json',
  'environments.json',
  'history.json',
  'oauth-configs.json',
];

/** Copy fresh fixture data into test-data directory */
function resetTestData() {
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  for (const file of FIXTURE_FILES) {
    const src = path.join(FIXTURES_DIR, file);
    const dest = path.join(TEST_DATA_DIR, file);
    fs.copyFileSync(src, dest);
  }
}

/** Ensure screenshots directory exists */
function ensureScreenshotDir(category: string) {
  const dir = path.join(SCREENSHOTS_DIR, category);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export type TestFixtures = {
  /** Take a categorised screenshot for documentation */
  takeScreenshot: (category: string, name: string) => Promise<void>;
  /** The test page, navigated to the app root */
  appPage: Page;
};

export const test = base.extend<TestFixtures>({
  takeScreenshot: async ({ page }, use, testInfo) => {
    const fn = async (category: string, name: string) => {
      ensureScreenshotDir(category);
      const filePath = path.join(SCREENSHOTS_DIR, category, `${name}.png`);
      const buffer = await page.screenshot({ path: filePath, fullPage: false });
      await testInfo.attach(`${category}/${name}`, {
        body: buffer,
        contentType: 'image/png',
      });
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
