import { test as base, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const TEST_DATA_DIR = path.resolve(__dirname, '..', 'test-data');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'screenshots');
const DOC_SCREENSHOTS_DIR = path.resolve(__dirname, '..', '..', 'website', 'src', 'public', 'screenshots');

const FIXTURE_FILES = [
  'collections.json',
  'environments.json',
  'history.json',
  'oauth-configs.json',
];

/** Workspace data files that live in the workspace root */
const WORKSPACE_FILES = [
  'collections.json',
  'environments.json',
  'oauth-configs.json',
];

/** Local-only files that live in .requesto/ */
const LOCAL_FILES = [
  'history.json',
];

/** Copy fresh fixture data into test-data directory (workspace-aware layout) */
function resetTestData() {
  // Create workspace directory (test-data IS the workspace directory)
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  // Create .requesto/ local data directory
  const localDir = path.join(TEST_DATA_DIR, '.requesto');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  // Copy workspace-scoped files to workspace root
  for (const file of WORKSPACE_FILES) {
    const src = path.join(FIXTURES_DIR, file);
    const dest = path.join(TEST_DATA_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  // Copy local-only files to .requesto/
  for (const file of LOCAL_FILES) {
    const src = path.join(FIXTURES_DIR, file);
    const dest = path.join(localDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  // Initialize oauth-secrets.json in .requesto/
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
        path: TEST_DATA_DIR,
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
