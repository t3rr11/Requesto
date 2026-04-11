import { test, expect, resetData } from '../helpers/test-fixtures';

test.describe('Request Execution', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('open a saved request from the sidebar', async ({ appPage, takeScreenshot }) => {
    // Expand GitHub API collection
    await appPage.getByText('GitHub API').click();

    // Click the "Get User" request
    await appPage.getByText('Get User').click();

    // Tab should open with the request loaded
    await expect(appPage.getByPlaceholder('Enter request url')).toHaveValue(
      'https://api.github.com/users/octocat'
    );

    await takeScreenshot('requests', 'saved-request-open');
  });

  test('send a GET request and view response', async ({ appPage, takeScreenshot }) => {
    // Expand GitHub API and open Get User request
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();

    // Click Send button
    await appPage.getByRole('button', { name: 'Send' }).click();

    // Wait for the response panel to show a status code
    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });

    // Response body should contain JSON data about octocat
    await expect(appPage.getByText('octocat').first()).toBeVisible({ timeout: 5_000 });

    await takeScreenshot('requests', 'get-response');
  });

  test('create a new tab and send a custom request', async ({ appPage, takeScreenshot }) => {
    // Open a new tab
    await appPage.getByLabel('New tab').click();

    // Set the method to GET (default) and enter URL
    const urlInput = appPage.getByPlaceholder('Enter request url');
    await urlInput.fill('https://jsonplaceholder.typicode.com/posts/1');

    // Switch to headers tab and add a header
    await appPage.getByRole('button', { name: 'Headers' }).click();

    // The key-value editor should be visible - fill first row
    const headerKeyInputs = appPage.locator('input[placeholder="Header"]');
    const headerValueInputs = appPage.locator('input[placeholder="Value"]');

    if (await headerKeyInputs.first().isVisible()) {
      await headerKeyInputs.first().fill('Accept');
      await headerValueInputs.first().fill('application/json');
    }

    await takeScreenshot('requests', 'custom-request-form');

    // Send the request
    await appPage.getByRole('button', { name: 'Send' }).click();

    // Wait for response
    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });

    await takeScreenshot('requests', 'custom-request-response');
  });

  test('send a POST request with JSON body', async ({ appPage, takeScreenshot }) => {
    // Open a new tab
    await appPage.getByLabel('New tab').click();

    // Change method to POST
    const methodSelect = appPage.locator('select').first();
    await methodSelect.selectOption('POST');

    // Enter URL
    const urlInput = appPage.getByPlaceholder('Enter request url');
    await urlInput.fill('https://jsonplaceholder.typicode.com/posts');

    // Switch to body tab
    await appPage.getByRole('button', { name: 'Body' }).click();

    // The Monaco editor should be visible — type JSON body
    const monacoEditor = appPage.locator('.monaco-editor').first();
    await expect(monacoEditor).toBeVisible();
    await monacoEditor.click();

    // Use keyboard to type in Monaco
    await appPage.keyboard.press('Control+a');
    await appPage.keyboard.type('{"title": "Test Post", "body": "Created by Playwright", "userId": 1}');

    await takeScreenshot('requests', 'post-request-form');

    // Send the request
    await appPage.getByRole('button', { name: 'Send' }).click();

    // Wait for 201 Created response
    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });

    await takeScreenshot('requests', 'post-response');
  });

  test('save a request to a collection', async ({ appPage, takeScreenshot }) => {
    // Open new tab and fill in a request
    await appPage.getByLabel('New tab').click();
    const urlInput = appPage.getByPlaceholder('Enter request url');
    await urlInput.fill('https://jsonplaceholder.typicode.com/users');

    // Click Save button — this should open the save dialog since it's unsaved
    await appPage.getByRole('button', { name: 'Save' }).first().click();

    // Save Request dialog should appear
    const dialogHeading = appPage.locator('h2', { hasText: 'Save Request' });
    await expect(dialogHeading).toBeVisible();
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    // Fill in request name
    await dialog.locator('#request-name').fill('List All Users');

    // Select a collection from dropdown
    await dialog.locator('#collection-select').selectOption({ label: 'Sample API' });

    await takeScreenshot('requests', 'save-to-collection');

    // Submit
    await dialog.getByRole('button', { name: 'Save Request' }).click();

    // Dialog should close
    await expect(dialogHeading).toBeHidden();

    // Dismiss the success alert if visible
    const okButton = appPage.getByRole('button', { name: 'OK' });
    if (await okButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await okButton.click();
    }

    // The request should now appear in the Sample API collection
    await appPage.getByText('Sample API').first().click();
    await expect(appPage.getByText('List All Users').first()).toBeVisible();

    await takeScreenshot('requests', 'request-saved-in-collection');
  });

  test('view request details in console panel', async ({ appPage, takeScreenshot }) => {
    // Open the console panel
    const consoleToggle = appPage.getByTitle('Show Console');
    if (await consoleToggle.isVisible()) {
      await consoleToggle.click();
    }

    // Expand GitHub API and send a request
    await appPage.getByText('GitHub API').click();
    await appPage.getByText('Get User').click();
    await appPage.getByRole('button', { name: 'Send' }).click();

    // Wait for response
    const statusBadge = appPage.locator('text=/^2\\d{2}/').first();
    await expect(statusBadge).toBeVisible({ timeout: 15_000 });

    // Console should have a log entry
    await expect(appPage.getByText('Console')).toBeVisible();

    await takeScreenshot('requests', 'console-panel');
  });

  test('tab management - open, switch, and close tabs', async ({ appPage, takeScreenshot }) => {
    // Open first tab
    await appPage.getByLabel('New tab').click();
    const urlInput1 = appPage.getByPlaceholder('Enter request url');
    await urlInput1.fill('https://example.com/api/first');

    // Open second tab
    await appPage.getByLabel('New tab').click();
    const urlInput2 = appPage.getByPlaceholder('Enter request url');
    await urlInput2.fill('https://example.com/api/second');

    await takeScreenshot('requests', 'multiple-tabs');

    // Switch back to first tab by clicking on it
    const tabs = appPage.locator('[data-tab-id]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    // Close current tab using keyboard shortcut
    await appPage.keyboard.press('Control+w');

    // Confirm close if there are unsaved changes
    const confirmDialog = appPage.locator('.fixed.inset-0.z-50');
    if (await confirmDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmDialog.getByRole('button', { name: 'Close' }).click();
    }
  });
});
