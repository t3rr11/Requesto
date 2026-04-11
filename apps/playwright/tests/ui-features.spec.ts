import { test, expect, resetData } from '../helpers/test-fixtures';

test.describe('UI Features', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('toggle dark and light theme', async ({ appPage, takeScreenshot }) => {
    // App starts in dark mode by default
    const html = appPage.locator('html');

    // Take screenshot of dark theme
    await takeScreenshot('ui', 'dark-theme');

    // Click the theme toggle button
    const lightToggle = appPage.getByTitle('Switch to Light Mode');
    const darkToggle = appPage.getByTitle('Switch to Dark Mode');

    if (await lightToggle.isVisible().catch(() => false)) {
      await lightToggle.click();
    } else if (await darkToggle.isVisible().catch(() => false)) {
      await darkToggle.click();
    }

    // Wait for theme transition
    await appPage.waitForTimeout(300);

    await takeScreenshot('ui', 'light-theme');

    // Toggle back to dark mode for subsequent tests
    const toggleBack = appPage.getByTitle('Switch to Dark Mode');
    if (await toggleBack.isVisible().catch(() => false)) {
      await toggleBack.click();
      await appPage.waitForTimeout(300);
    }
  });

  test('toggle sidebar visibility', async ({ appPage, takeScreenshot }) => {
    // Sidebar should be visible initially with "Collections" header
    await expect(appPage.getByText('Collections').first()).toBeVisible();

    // Click sidebar toggle to hide it
    const hideButton = appPage.getByTitle('Hide Sidebar');
    if (await hideButton.isVisible().catch(() => false)) {
      await hideButton.click();
      await appPage.waitForTimeout(300);
    }

    await takeScreenshot('ui', 'sidebar-collapsed');

    // Click sidebar toggle to show it again
    const showButton = appPage.getByTitle('Show Sidebar');
    if (await showButton.isVisible().catch(() => false)) {
      await showButton.click();
      await appPage.waitForTimeout(300);
    }

    // Sidebar should be visible again
    await expect(appPage.getByText('Collections').first()).toBeVisible();
  });

  test('toggle response panel layout', async ({ appPage, takeScreenshot }) => {
    // First, open a request so we have the response panel visible
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();

    // Take screenshot of current layout
    await takeScreenshot('ui', 'horizontal-layout');

    // Click layout toggle
    const verticalToggle = appPage.getByTitle('Switch to Vertical Layout');
    const horizontalToggle = appPage.getByTitle('Switch to Horizontal Layout');

    if (await verticalToggle.isVisible().catch(() => false)) {
      await verticalToggle.click();
      await appPage.waitForTimeout(300);
      await takeScreenshot('ui', 'vertical-layout');

      // Switch back
      const switchBack = appPage.getByTitle('Switch to Horizontal Layout');
      if (await switchBack.isVisible().catch(() => false)) {
        await switchBack.click();
      }
    } else if (await horizontalToggle.isVisible().catch(() => false)) {
      await takeScreenshot('ui', 'vertical-layout');
      await horizontalToggle.click();
      await appPage.waitForTimeout(300);
      await takeScreenshot('ui', 'horizontal-layout');
    }
  });

  test('toggle console panel', async ({ appPage, takeScreenshot }) => {
    // Show console if hidden
    const showConsole = appPage.getByTitle('Show Console');
    if (await showConsole.isVisible().catch(() => false)) {
      await showConsole.click();
      await appPage.waitForTimeout(300);
    }

    // Console should be visible with "Console" header
    await expect(appPage.getByText('Console').first()).toBeVisible();

    await takeScreenshot('ui', 'console-open');

    // Hide console
    const hideConsole = appPage.getByTitle('Hide Console');
    if (await hideConsole.isVisible().catch(() => false)) {
      await hideConsole.click();
      await appPage.waitForTimeout(300);
    }

    await takeScreenshot('ui', 'console-closed');
  });

  test('keyboard shortcuts work', async ({ appPage }) => {
    // Ctrl+T should open a new tab (same as Ctrl+N)
    await appPage.keyboard.press('Control+t');

    // A new tab should be created — verify by checking for the URL input
    await expect(appPage.getByPlaceholder('Enter request url')).toBeVisible();

    // Ctrl+W should close the tab
    await appPage.keyboard.press('Control+w');
  });

  test('help dialog opens and closes', async ({ appPage, takeScreenshot }) => {
    // Click the help button
    const helpButton = appPage.getByTitle('Help');
    await helpButton.click();

    // Help dialog should appear
    const dialogHeading = appPage.locator('h2', { hasText: 'Help' });
    await expect(dialogHeading).toBeVisible();

    await takeScreenshot('ui', 'help-dialog');

    // Close it
    await appPage.keyboard.press('Escape');
    await expect(dialogHeading).toBeHidden();
  });
});
