import { test as baseTest, expect, resetData } from '../helpers/test-fixtures';
import { type Page } from '@playwright/test';

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

  test('app overview with request open', async ({ appPage, takeDocScreenshot }) => {
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

  test('create folder inline input', async ({ appPage, takeDocScreenshot }) => {
    // Widen sidebar so the inline input and Save button are fully visible
    await widenSidebar(appPage, 400);

    // Expand collection to provide context
    await appPage.getByText('Sample API').click();

    // Hover to reveal action buttons, then click New Folder
    await appPage.getByText('Sample API').hover();
    await appPage.waitForTimeout(300);
    await appPage.getByTitle('New Folder').first().click();

    // Wait for inline folder name input to appear
    const folderInput = appPage.getByPlaceholder('Folder name...');
    await expect(folderInput).toBeVisible();
    await folderInput.fill('Products');

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
