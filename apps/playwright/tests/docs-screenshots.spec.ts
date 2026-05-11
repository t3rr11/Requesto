import { test as baseTest, expect, resetData } from '../helpers/test-fixtures';
import { type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Documentation screenshots for the VitePress website.
 *
 * Outputs go to apps/website/src/public/screenshots/{category}/{name}.png
 * so VitePress can reference them as /screenshots/{category}/{name}.png.
 *
 * Run with:  npm run screenshots:docs
 */

// Override appPage fixture to pre-set equal panel widths before app loads
const test = baseTest.extend<{ appPage: Page }>({
  appPage: async ({ page }, use) => {
    // Inject localStorage before navigation so Zustand hydrates with equal panels.
    // At 1920px viewport with ~240px sidebar, the content area is ~1680px.
    // Setting requestPanelWidth to 830 gives roughly 50/50 split.
    await page.addInitScript(() => {
      const uiState = {
        state: {
          isSidebarOpen: true,
          sidebarWidth: 280,
          requestPanelWidth: 810,
          requestPanelHeight: 400,
          panelLayout: 'horizontal',
          isConsoleOpen: false,
          consoleHeight: 300,
          expandedCollections: [],
          expandedFolders: [],
        },
      };
      localStorage.setItem('requesto-ui-storage', JSON.stringify(uiState));
    });
    await page.goto('/');
    await page.waitForSelector('text=Collections', { timeout: 15_000 });
    await page.waitForSelector('text=Sample API', { timeout: 10_000 });
    await use(page);
  },
});

test.use({ viewport: { width: 1920, height: 1080 } });

/** Widen the sidebar for screenshots that need more sidebar space */
async function widenSidebar(page: Page, width = 350) {
  await page.evaluate((w) => {
    const sidebar = document.querySelector('.flex-none.border-r') as HTMLElement;
    if (sidebar?.style) sidebar.style.width = `${w}px`;
  }, width);
  await page.waitForTimeout(200);
}

/** Wait for the response body Monaco editor to fully render */
async function waitForResponseBody(page: Page) {
  const responseEditor = page.locator('.monaco-editor').last();
  await responseEditor.waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ---------------------------------------------------------------------------
// Home / Introduction — hero & overview shots
// ---------------------------------------------------------------------------
test.describe('Home & Introduction', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('app overview with request open', async ({ appPage, takeDocScreenshot, takeReadmeScreenshot }) => {
    // Expand Sample API to show folder structure
    await appPage.getByText('Sample API').click();
    await appPage.getByText('Users').click();

    // Open a saved request so the request/response panels are populated
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();

    // Send request to populate the response panel
    await appPage.getByRole('button', { name: 'Send' }).click();
    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });
    await expect(appPage.getByText('octocat').first()).toBeVisible({ timeout: 5_000 });

    await waitForResponseBody(appPage);

    await takeDocScreenshot('introduction', 'app-overview');
    await takeDocScreenshot('home', 'hero-screenshot');

    // Also generate README hero images (images/example-light.png & images/example-dark.png)
    await takeReadmeScreenshot('example');
  });
});

// ---------------------------------------------------------------------------
// Getting Started — step-by-step tutorial screenshots
// ---------------------------------------------------------------------------
test.describe('Getting Started', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('blank request tab', async ({ appPage, takeDocScreenshot }) => {
    // A new tab is the default state when no saved request is selected
    await appPage.getByLabel('New tab').click();
    await takeDocScreenshot('getting-started', 'blank-request-tab');
  });

  test('first GET request with response', async ({ appPage, takeDocScreenshot }) => {
    // Fill in a URL and send
    await appPage.getByLabel('New tab').click();
    const urlInput = appPage.getByPlaceholder('Enter request url');
    await urlInput.fill('https://api.github.com/users/octocat');

    await appPage.getByRole('button', { name: 'Send' }).click();

    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });
    await expect(appPage.getByText('octocat').first()).toBeVisible({ timeout: 5_000 });

    await waitForResponseBody(appPage);

    await takeDocScreenshot('getting-started', 'first-request');
  });

  test('save request dialog', async ({ appPage, takeDocScreenshot }) => {
    // Open a new tab with a URL so Save is meaningful
    await appPage.getByLabel('New tab').click();
    const urlInput = appPage.getByPlaceholder('Enter request url');
    await urlInput.fill('https://jsonplaceholder.typicode.com/users');

    // Click Save to open the dialog
    await appPage.getByRole('button', { name: 'Save' }).first().click();

    const dialogHeading = appPage.locator('h2', { hasText: 'Save Request' });
    await expect(dialogHeading).toBeVisible();
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    // Fill in the form to make the dialog look realistic
    await dialog.locator('#request-name').fill('List Users');
    await dialog.locator('#collection-select').selectOption({ label: 'Sample API' });

    // Wait for dialog animation to fully settle
    await appPage.waitForTimeout(500);

    await takeDocScreenshot('getting-started', 'save-dialog');

    // Close the dialog
    await appPage.keyboard.press('Escape');
  });

  test('full interface overview', async ({ appPage, takeDocScreenshot }) => {
    // Expand collections, open a request, show console — full interface
    await appPage.getByText('Sample API').click();
    await appPage.getByText('Users').click();
    await appPage.getByText('List Users').click();

    // Send a request so response panel is filled
    await appPage.getByRole('button', { name: 'Send' }).click();
    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });

    await waitForResponseBody(appPage);

    // Open console
    const showConsole = appPage.getByTitle('Show Console');
    if (await showConsole.isVisible().catch(() => false)) {
      await showConsole.click();
      await appPage.waitForTimeout(300);
    }

    await takeDocScreenshot('getting-started', 'interface-overview');

    // Close console for clean state
    const hideConsole = appPage.getByTitle('Hide Console');
    if (await hideConsole.isVisible().catch(() => false)) {
      await hideConsole.click();
      await appPage.waitForTimeout(300);
    }
  });
});

// ---------------------------------------------------------------------------
// Collections & Folders
// ---------------------------------------------------------------------------
test.describe('Collections', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('sidebar with collections', async ({ appPage, takeDocScreenshot }) => {
    // Expand Sample API to show the nested tree structure
    await appPage.getByText('Sample API').click();
    await appPage.getByText('Users').click();

    await expect(appPage.getByText('List Users')).toBeVisible();
    await expect(appPage.getByText('GitHub API')).toBeVisible();

    await takeDocScreenshot('collections', 'sidebar-with-collections');
  });

  test('expanded collection tree', async ({ appPage, takeDocScreenshot }) => {
    await appPage.getByText('Sample API').click();
    await appPage.getByText('Users').click();
    await appPage.getByText('Posts').click();

    await expect(appPage.getByText('List Users')).toBeVisible();
    await expect(appPage.getByText('Create User')).toBeVisible();
    await expect(appPage.getByText('List Posts')).toBeVisible();

    await takeDocScreenshot('collections', 'expanded-collection');
  });

  test('create folder dialog', async ({ appPage, takeDocScreenshot }) => {
    // Widen sidebar so the hover actions are fully visible
    await widenSidebar(appPage, 400);

    // Expand collection to provide context
    await appPage.getByText('Sample API').click();

    // Hover to reveal action buttons, then click New Folder
    await appPage.getByText('Sample API').hover();
    await appPage.waitForTimeout(300);
    await appPage.getByTitle('New Folder').first().click();

    // Wait for the New Folder dialog to appear
    const dialogHeading = appPage.locator('h2', { hasText: 'New Folder' });
    await expect(dialogHeading).toBeVisible();

    // Fill in the name field so the dialog looks realistic
    await appPage.locator('#folder-name').fill('Products');
    await appPage.waitForTimeout(200);

    await takeDocScreenshot('collections', 'hover-actions');

    // Cancel folder creation
    await appPage.keyboard.press('Escape');
  });

  test('new collection dialog', async ({ appPage, takeDocScreenshot }) => {
    await appPage.getByTitle('New Collection').click();

    const dialogHeading = appPage.locator('h2', { hasText: 'New Collection' });
    await expect(dialogHeading).toBeVisible();

    await takeDocScreenshot('collections', 'new-collection-dialog');

    await appPage.keyboard.press('Escape');
  });

  test('context menu on collection', async ({ appPage, takeDocScreenshot }) => {
    await appPage.getByText('Sample API').click({ button: 'right' });

    // Wait for context menu to appear
    await expect(appPage.getByText('Rename')).toBeVisible();

    await takeDocScreenshot('collections', 'context-menu');

    // Dismiss context menu
    await appPage.keyboard.press('Escape');
  });

  test('search filter', async ({ appPage, takeDocScreenshot }) => {
    const searchInput = appPage.getByPlaceholder('Search collections...');
    await searchInput.fill('GitHub');

    await expect(appPage.getByText('GitHub API')).toBeVisible();

    await takeDocScreenshot('collections', 'search-filter');

    // Clear search
    await searchInput.clear();
  });
});

// ---------------------------------------------------------------------------
// Environments
// ---------------------------------------------------------------------------
test.describe('Environments', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('active environment indicator', async ({ appPage, takeDocScreenshot }) => {
    await expect(appPage.getByText('Development')).toBeVisible();
    await takeDocScreenshot('environments', 'active-environment');
  });

  test('environment selector dropdown', async ({ appPage, takeDocScreenshot }) => {
    const envButton = appPage.getByText('Development').first();
    await envButton.click();

    await expect(appPage.getByText('Production')).toBeVisible();
    await expect(appPage.getByText('No Environment')).toBeVisible();

    await takeDocScreenshot('environments', 'selector-dropdown');

    // Close dropdown by pressing Escape
    await appPage.keyboard.press('Escape');
  });

  test('manage environments dialog', async ({ appPage, takeDocScreenshot }) => {
    await appPage.getByTitle('Manage Environments').click();

    const dialogHeading = appPage.locator('h2', { hasText: 'Manage Environments' });
    await expect(dialogHeading).toBeVisible();
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    // Select Development to show its variables
    await dialog.getByRole('button', { name: /Development/ }).click();

    await expect(dialog.locator('input[value="baseUrl"]')).toBeVisible();

    await takeDocScreenshot('environments', 'manage-dialog');
  });

  test('variable editor table', async ({ appPage, takeDocScreenshot }) => {
    // Open the Manage Environments dialog
    await appPage.getByTitle('Manage Environments').click();

    const dialogHeading = appPage.locator('h2', { hasText: 'Manage Environments' });
    await expect(dialogHeading).toBeVisible();
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    // Click Development to ensure variables are shown
    await dialog.getByRole('button', { name: /Development/ }).click();

    await expect(dialog.locator('input[value="baseUrl"]')).toBeVisible();
    await expect(dialog.locator('input[value="apiKey"]')).toBeVisible();

    await takeDocScreenshot('environments', 'variable-editor');

    // Close dialog
    await appPage.keyboard.press('Escape');
  });

  test('variable autocomplete in URL', async ({ appPage, takeDocScreenshot }) => {
    // Ensure Development is active
    await expect(appPage.getByText('Development').first()).toBeVisible();

    // Open a new tab and type {{ to trigger autocomplete
    await appPage.getByLabel('New tab').click();
    const urlInput = appPage.getByPlaceholder('Enter request url');
    await urlInput.fill('{{');

    // Wait for autocomplete suggestions
    await appPage.waitForTimeout(500);

    await takeDocScreenshot('environments', 'autocomplete');

    // Clear input
    await urlInput.clear();
  });
});

// ---------------------------------------------------------------------------
// OAuth 2.0
// ---------------------------------------------------------------------------
test.describe('OAuth', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('oauth config form', async ({ appPage, takeDocScreenshot }) => {
    // Open a request and go to the Auth tab to show OAuth options
    await appPage.getByLabel('New tab').click();

    // Navigate to Auth tab
    await appPage.getByRole('button', { name: 'Auth' }).click();

    await takeDocScreenshot('oauth', 'auth-tab');
  });

  test('request auth type selection', async ({ appPage, takeDocScreenshot }) => {
    // The Auth tab should already be visible; capture the auth type dropdown
    const authSelect = appPage.locator('select').filter({ hasText: /None|Bearer|Basic|OAuth/i });
    if (await authSelect.isVisible().catch(() => false)) {
      await authSelect.selectOption('bearer');
      await appPage.waitForTimeout(300);
    }

    await takeDocScreenshot('oauth', 'bearer-auth');
  });
});

// ---------------------------------------------------------------------------
// Settings — application-wide settings dialog
// ---------------------------------------------------------------------------
test.describe('Settings', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('settings dialog', async ({ appPage, takeDocScreenshot }) => {
    // Open the Settings dialog from the gear icon in the header
    await appPage.locator('button[title="Settings"]').click();

    const dialogHeading = appPage.locator('h2', { hasText: 'Settings' });
    await expect(dialogHeading).toBeVisible();

    await takeDocScreenshot('settings', 'dialog');

    // Close dialog
    await appPage.keyboard.press('Escape');
  });

  test('settings dialog with warning', async ({ appPage, takeDocScreenshot }) => {
    await appPage.locator('button[title="Settings"]').click();

    const dialogHeading = appPage.locator('h2', { hasText: 'Settings' });
    await expect(dialogHeading).toBeVisible();
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    // Toggle the insecureTls checkbox to reveal the amber security warning
    await dialog.locator('input[type="checkbox"]').first().check();
    await expect(dialog.getByText(/Disabling certificate verification/i)).toBeVisible();
    await appPage.waitForTimeout(200);

    await takeDocScreenshot('settings', 'dialog-warning');

    // Toggle back off and close so subsequent tests start clean
    await dialog.locator('input[type="checkbox"]').first().uncheck();
    await appPage.keyboard.press('Escape');
  });
});

// ---------------------------------------------------------------------------
// Console & Logging
// ---------------------------------------------------------------------------
test.describe('Console', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('console expanded with logs', async ({ appPage, takeDocScreenshot }) => {
    // Send a request to generate console logs
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();
    await appPage.getByRole('button', { name: 'Send' }).click();

    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });

    // Open console
    const showConsole = appPage.getByTitle('Show Console');
    if (await showConsole.isVisible().catch(() => false)) {
      await showConsole.click();
      await appPage.waitForTimeout(300);
    }

    await takeDocScreenshot('console', 'expanded-panel');
  });

  test('console expanded group details', async ({ appPage, takeDocScreenshot }) => {
    // Send a request to generate console logs
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();
    await appPage.getByRole('button', { name: 'Send' }).click();

    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });

    // Open console
    const showConsole = appPage.getByTitle('Show Console');
    if (await showConsole.isVisible().catch(() => false)) {
      await showConsole.click();
      await appPage.waitForTimeout(300);
    }

    // Make console panel taller to show expanded details
    await appPage.evaluate(() => {
      const consoleEl = document.querySelector('.fixed.bottom-0') as HTMLElement;
      if (consoleEl) consoleEl.style.height = '500px';
    });
    await appPage.waitForTimeout(300);

    // Click the log group to expand it - scoped to the console panel
    const consolePanel = appPage.locator('.fixed.bottom-0');
    const logGroup = consolePanel.locator('.cursor-pointer').filter({ hasText: /api\.github\.com/ }).first();
    await logGroup.click();
    await appPage.waitForTimeout(500);

    await takeDocScreenshot('console', 'expanded-group');
  });
});

// ---------------------------------------------------------------------------
// UI Variants — theme & layout
// ---------------------------------------------------------------------------
test.describe('UI Variants', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('dark theme', async ({ appPage, takeDocScreenshot }) => {
    // Open a request to make the screenshot more interesting
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();

    // App starts in dark mode by default
    await takeDocScreenshot('ui', 'dark-theme');
  });

  test('light theme', async ({ appPage, takeDocScreenshot }) => {
    // Open a request
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();

    // Switch to light mode
    const lightToggle = appPage.getByTitle('Switch to Light Mode');
    if (await lightToggle.isVisible().catch(() => false)) {
      await lightToggle.click();
      await appPage.waitForTimeout(300);
    }

    await takeDocScreenshot('ui', 'light-theme');

    // Switch back to dark mode
    const darkToggle = appPage.getByTitle('Switch to Dark Mode');
    if (await darkToggle.isVisible().catch(() => false)) {
      await darkToggle.click();
      await appPage.waitForTimeout(300);
    }
  });

  test('horizontal layout', async ({ appPage, takeDocScreenshot }) => {
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();

    // Send request to show response
    await appPage.getByRole('button', { name: 'Send' }).click();
    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });

    await waitForResponseBody(appPage);

    await takeDocScreenshot('ui', 'horizontal-layout');
  });

  test('vertical layout', async ({ appPage, takeDocScreenshot }) => {
    // Toggle to vertical layout
    const verticalToggle = appPage.getByTitle('Switch to Vertical Layout');
    if (await verticalToggle.isVisible().catch(() => false)) {
      await verticalToggle.click();
      await appPage.waitForTimeout(300);
    }

    await takeDocScreenshot('ui', 'vertical-layout');

    // Switch back to horizontal
    const horizontalToggle = appPage.getByTitle('Switch to Horizontal Layout');
    if (await horizontalToggle.isVisible().catch(() => false)) {
      await horizontalToggle.click();
      await appPage.waitForTimeout(300);
    }
  });
});

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------
test.describe('Workspaces', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('workspace switcher dropdown', async ({ appPage, takeDocScreenshot }) => {
    // Open the workspace switcher dropdown (title is the active workspace name)
    const switcher = appPage.locator('button[title="Default"]');
    await switcher.click();

    // Wait for dropdown to appear
    await expect(appPage.getByText('Workspaces', { exact: true })).toBeVisible();
    await expect(appPage.getByText('Manage Workspaces...')).toBeVisible();

    await takeDocScreenshot('workspaces', 'workspace-switcher');

    // Close dropdown
    await appPage.keyboard.press('Escape');
  });

  test('workspace manager dialog', async ({ appPage, takeDocScreenshot }) => {
    // Open the workspace switcher, then click Manage
    const switcher = appPage.locator('button[title="Default"]');
    await switcher.click();
    await appPage.getByText('Manage Workspaces...').click();

    const dialogHeading = appPage.locator('h2', { hasText: 'Manage Workspaces' });
    await expect(dialogHeading).toBeVisible();

    await takeDocScreenshot('workspaces', 'workspace-manager-dialog');

    // Close dialog
    await appPage.keyboard.press('Escape');
  });

  test('create workspace form', async ({ appPage, takeDocScreenshot }) => {
    // Open workspace manager
    const switcher = appPage.locator('button[title="Default"]');
    await switcher.click();
    await appPage.getByText('Manage Workspaces...').click();

    await expect(appPage.locator('h2', { hasText: 'Manage Workspaces' })).toBeVisible();

    // Click New Workspace
    await appPage.getByRole('button', { name: 'New Workspace' }).click();

    await expect(appPage.locator('h2', { hasText: 'New Workspace' })).toBeVisible();

    // Fill in the name field
    await appPage.locator('#workspace-name').fill('My Project');

    await takeDocScreenshot('workspaces', 'create-workspace-form');
  });

  test('clone from git form', async ({ appPage, takeDocScreenshot }) => {
    // The create form should still be open from the previous test, but reset to be safe
    const heading = appPage.locator('h2', { hasText: 'New Workspace' });
    if (!await heading.isVisible().catch(() => false)) {
      const switcher = appPage.locator('button[title="Default"]');
      await switcher.click();
      await appPage.getByText('Manage Workspaces...').click();
      await appPage.getByRole('button', { name: 'New Workspace' }).click();
      await expect(heading).toBeVisible();
    }

    // Toggle clone from git
    await appPage.locator('#clone-toggle').check();

    // Fill in the fields
    await appPage.locator('#workspace-name').fill('Shared API Collection');
    await appPage.locator('#repo-url').fill('https://github.com/team/api-collection.git');

    await takeDocScreenshot('git', 'clone-workspace-form');

    // Close dialog
    await appPage.keyboard.press('Escape');
  });
});

// ---------------------------------------------------------------------------
// OpenAPI Import & Sync (doc screenshots)
// ---------------------------------------------------------------------------
test.describe('OpenAPI Docs', () => {
  const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
  const SPEC_PATH = path.join(FIXTURES_DIR, 'openapi-spec.json');
  let originalSpecContent: Buffer;

  test.beforeAll(() => {
    resetData();
    // Save original spec content before any test modifies it
    originalSpecContent = fs.readFileSync(SPEC_PATH);
  });

  test('openapi import dialog', async ({ appPage, takeDocScreenshot }) => {
    const specPath = path.join(FIXTURES_DIR, 'openapi-spec.json').replace(/\\/g, '/');

    // Open the import dropdown, then click "OpenAPI Spec"
    await appPage.getByTitle('Import').click();
    await appPage.getByText('OpenAPI Spec').click();

    const dialogHeading = appPage.locator('h2', { hasText: 'Import from OpenAPI' });
    await expect(dialogHeading).toBeVisible();
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    // Fill in the spec source
    await dialog.locator('#openapi-source').fill(specPath);

    // Enable linking so Sync from Spec is available later
    await dialog.locator('#link-spec-toggle').check();

    await takeDocScreenshot('openapi', 'import-dialog');

    // Submit the form
    await dialog.getByRole('button', { name: 'Import' }).click();

    // Wait for collection to appear
    await expect(appPage.getByText('Playwright Test API', { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('imported collection structure', async ({ appPage, takeDocScreenshot }) => {
    // Expand the imported collection
    await appPage.getByText('Playwright Test API', { exact: true }).click();
    await expect(appPage.getByText('pets')).toBeVisible();
    await appPage.getByText('pets').click();
    await expect(appPage.getByText('List all pets')).toBeVisible();

    await takeDocScreenshot('openapi', 'imported-collection');
  });

  test('sync preview dialog', async ({ appPage, takeDocScreenshot }) => {
    // Replace the spec with the v2 that has a new operation
    const updatedSpec = path.join(FIXTURES_DIR, 'openapi-spec-v2.json');
    fs.copyFileSync(updatedSpec, SPEC_PATH);

    // Collapse the collection first so the right-click targets the collection header
    const collectionHeader = appPage.getByText('Playwright Test API', { exact: true });
    // Click to collapse if expanded
    await collectionHeader.click();
    await appPage.waitForTimeout(300);

    // Right-click the collection header
    await collectionHeader.click({ button: 'right' });
    await expect(appPage.getByText('Sync from Spec')).toBeVisible();
    await appPage.getByText('Sync from Spec').click();

    // Wait for sync preview dialog content
    const syncDialog = appPage.locator('h2', { hasText: 'Sync from OpenAPI Spec' });
    await expect(syncDialog).toBeVisible({ timeout: 15_000 });

    await takeDocScreenshot('openapi', 'sync-preview');

    // Close dialog
    await appPage.keyboard.press('Escape');
  });

  test.afterAll(() => {
    // Restore the original spec file exactly as it was
    fs.writeFileSync(SPEC_PATH, originalSpecContent);
  });
});

// ---------------------------------------------------------------------------
// Pre-request Scripts
// ---------------------------------------------------------------------------
test.describe('Pre-request Scripts', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('pre-request script editor', async ({ appPage, takeDocScreenshot }) => {
    // Open the GitHub API collection and the Get User request (which has a preRequestScript)
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();

    // Click the Pre-request tab in the request form
    await appPage.getByRole('button', { name: /Pre-request/ }).click();

    // Wait for Monaco editor to be visible
    const editor = appPage.locator('.monaco-editor').first();
    await editor.waitFor({ state: 'visible', timeout: 10_000 });
    await appPage.waitForTimeout(800);

    await takeDocScreenshot('pre-request-scripts', 'editor');
  });
});

// ---------------------------------------------------------------------------
// Tests (Post-request scripts)
// ---------------------------------------------------------------------------
test.describe('Tests', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('test script editor', async ({ appPage, takeDocScreenshot }) => {
    // Open the GitHub API collection and the Get User request (which has a testScript)
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();

    // Click the Tests tab in the request form
    await appPage.getByRole('button', { name: /^Tests/ }).click();

    // Wait for Monaco editor to be visible
    const editor = appPage.locator('.monaco-editor').first();
    await editor.waitFor({ state: 'visible', timeout: 10_000 });
    await appPage.waitForTimeout(800);

    await takeDocScreenshot('tests', 'editor');
  });

  test('test results after sending request', async ({ appPage, takeDocScreenshot }) => {
    // Open Get User and send it to generate test results
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();

    await appPage.getByRole('button', { name: 'Send' }).click();

    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });

    // Wait for test results tab to show a pass/fail badge
    await expect(appPage.getByText('Test Results')).toBeVisible({ timeout: 5_000 });

    // Click the Test Results tab in the response panel
    await appPage.getByRole('button', { name: /Test Results/ }).click();
    await appPage.waitForTimeout(400);

    await takeDocScreenshot('tests', 'results');
  });
});

// ---------------------------------------------------------------------------
// Collection Runner
// ---------------------------------------------------------------------------
test.describe('Collection Runner', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('collection runner dialog', async ({ appPage, takeDocScreenshot }) => {
    // Right-click the GitHub API collection to open the context menu
    await appPage.getByText('GitHub API').click({ button: 'right' });
    await expect(appPage.getByText('Run Collection')).toBeVisible();
    await appPage.getByText('Run Collection').click();

    // Wait for the runner dialog to appear
    const dialogHeading = appPage.locator('h2', { hasText: 'Run: GitHub API' });
    await expect(dialogHeading).toBeVisible({ timeout: 5_000 });
    await appPage.waitForTimeout(400);

    await takeDocScreenshot('collection-runner', 'dialog');

    // Click Run Collection to execute the requests
    await appPage.getByRole('button', { name: 'Run Collection' }).click();

    // Wait for the run to complete — status badge changes from running to passed/failed/error
    await expect(appPage.locator('text=/passed|failed|error/i').first()).toBeVisible({ timeout: 20_000 });
    await appPage.waitForTimeout(600);

    await takeDocScreenshot('collection-runner', 'results');

    // Close dialog
    await appPage.keyboard.press('Escape');
  });
});

// ---------------------------------------------------------------------------
// Git Panel — requires a git-initialized workspace
// ---------------------------------------------------------------------------

const GIT_WORKSPACE_DIR = path.resolve(__dirname, '..', 'test-data');
const GIT_DIR = path.join(GIT_WORKSPACE_DIR, '.git');

/** Extended fixture that pre-opens the git panel via localStorage. */
const gitTest = test.extend<{ appPage: Page }>({
  appPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      const uiState = {
        state: {
          isSidebarOpen: true,
          sidebarWidth: 350,
          requestPanelWidth: 810,
          requestPanelHeight: 400,
          panelLayout: 'horizontal',
          isConsoleOpen: false,
          consoleHeight: 300,
          expandedCollections: [],
          expandedFolders: [],
          gitPanelHeight: 460,
        },
      };
      localStorage.setItem('requesto-ui-storage', JSON.stringify(uiState));
    });
    await page.goto('/');
    await page.waitForSelector('text=Collections', { timeout: 15_000 });
    // Wait for the backend to detect the git repo, then open the panel by clicking the status bar.
    const gitStatusBtn = page.locator('button[title*="Branch:"]');
    await gitStatusBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await gitStatusBtn.click();
    await page.waitForTimeout(400);
    await use(page);
  },
});

gitTest.describe('Git Panel', () => {
  gitTest.beforeAll(() => {
    resetData();
    // Initialise a git repository in the test workspace so the git panel activates.
    try {
      execSync('git init', { cwd: GIT_WORKSPACE_DIR, stdio: 'pipe' });
      execSync('git config user.email "test@requesto.test"', { cwd: GIT_WORKSPACE_DIR, stdio: 'pipe' });
      execSync('git config user.name "Requesto Test"', { cwd: GIT_WORKSPACE_DIR, stdio: 'pipe' });
      // Stage Requesto data files and create an initial commit so HEAD exists.
      execSync('git add .requesto', { cwd: GIT_WORKSPACE_DIR, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { cwd: GIT_WORKSPACE_DIR, stdio: 'pipe' });
      // Create a second branch for screenshot variety.
      execSync('git branch feature/team-api', { cwd: GIT_WORKSPACE_DIR, stdio: 'pipe' });
    } catch (e) {
      console.warn('Git setup skipped (git not available or already initialised):', e);
    }
  });

  gitTest.afterAll(() => {
    // Remove the test git repository so it does not affect subsequent test runs.
    if (fs.existsSync(GIT_DIR)) {
      fs.rmSync(GIT_DIR, { recursive: true, force: true });
    }
  });

  gitTest('git changes panel', async ({ appPage, takeDocScreenshot }) => {
    // The git panel header should appear once the backend detects the repo.
    await expect(appPage.getByText('Changes')).toBeVisible({ timeout: 10_000 });

    await takeDocScreenshot('git', 'changes-panel');
  });

  gitTest('git branches panel', async ({ appPage, takeDocScreenshot }) => {
    await expect(appPage.getByText('Branches')).toBeVisible({ timeout: 10_000 });

    // Expand the Branches section.
    await appPage.getByText('Branches').click();
    await appPage.waitForTimeout(400);

    // The branch list should show at least the current branch (main or master).
    await expect(appPage.locator('span.flex-1.truncate.font-mono.cursor-pointer').filter({ hasText: /^(main|master)$/ })).toBeVisible({ timeout: 5_000 });

    await takeDocScreenshot('git', 'branches-panel');
  });
});
