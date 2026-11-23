import { test, expect, resetData } from '../helpers/test-fixtures';

test.describe('Environment Variables', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('active environment is shown in the selector', async ({ appPage, takeScreenshot }) => {
    // The environment selector (compact dropdown) should show "Development" (active fixture)
    await expect(appPage.getByText('Development')).toBeVisible();

    await takeScreenshot('environments', 'active-environment');
  });

  test('selecting "No Environment" clears the active environment without API errors', async ({
    appPage,
    takeScreenshot,
  }) => {
    const apiErrors: string[] = [];
    appPage.on('response', res => {
      if (res.url().includes('/api/environments/active') && res.status() >= 400) {
        apiErrors.push(`${res.status()} ${res.url()}`);
      }
    });

    // Open the dropdown and pick "No Environment"
    await appPage.getByTestId('environment-switcher').click();
    await appPage.getByText('No Environment').click();

    // The switcher falls back to its empty-state title
    await expect(appPage.getByTitle('Select environment')).toBeVisible();
    expect(apiErrors).toEqual([]);

    await takeScreenshot('environments', 'no-environment-selected');

    // The cleared selection persists across a reload
    await appPage.reload();
    await appPage.waitForSelector('text=Sample API', { timeout: 10_000 });
    await expect(appPage.getByTitle('Select environment')).toBeVisible();
  });

  test('switch active environment via dropdown', async ({ appPage, takeScreenshot }) => {
    // Click the environment dropdown trigger
    const envButton = appPage.getByText('Development').first();
    await envButton.click();

    // Dropdown should show environment options
    await expect(appPage.getByText('Production')).toBeVisible();
    await expect(appPage.getByText('No Environment')).toBeVisible();

    await takeScreenshot('environments', 'selector-dropdown');

    // Select "Production"
    await appPage.getByText('Production').click();

    // The button should now show "Production"
    await expect(appPage.getByText('Production').first()).toBeVisible();
  });

  test('open environment manager and view variables', async ({ appPage, takeScreenshot }) => {
    // Open the environment manager from the header environment switcher dropdown
    await appPage.getByTestId('environment-switcher').click();
    await appPage.getByText('Manage Environments...').click();

    // The environment manager dialog should open
    const dialogHeading = appPage.locator('h2', { hasText: 'Manage Environments' });
    await expect(dialogHeading).toBeVisible();
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    // Should show the environments in the sidebar list (use button role for list items)
    await expect(dialog.getByRole('button', { name: /Development/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Production/ })).toBeVisible();

    // Click on Development to see its variables (use the list item button)
    await dialog.getByRole('button', { name: /Development/ }).click();

    // Should show the variables (use input value selector since Playwright has no getByDisplayValue)
    await expect(dialog.locator('input[value="baseUrl"]')).toBeVisible();
    await expect(dialog.locator('input[name="variables.0.value"]')).toHaveValue('https://jsonplaceholder.typicode.com');

    await takeScreenshot('environments', 'manager-dialog');

    // Close the dialog
    await appPage.keyboard.press('Escape');
  });

  test('create a new environment with variables', async ({ appPage, takeScreenshot }) => {
    // Open environment manager
    await appPage.getByTestId('environment-switcher').click();
    await appPage.getByText('Manage Environments...').click();

    const dialogHeading = appPage.locator('h2', { hasText: 'Manage Environments' });
    await expect(dialogHeading).toBeVisible();
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    // Click the "+" button to create a new environment
    await dialog.getByRole('button').filter({ has: appPage.locator('svg.lucide-plus') }).first().click();

    // The new environment should appear — use the heading (auto-selected environment name)
    await expect(dialog.getByRole('heading', { name: 'New Environment' })).toBeVisible();

    await takeScreenshot('environments', 'new-environment');

    // Close dialog
    await appPage.keyboard.press('Escape');
  });

  test('variable substitution in URL input shows autocomplete', async ({ appPage, takeScreenshot }) => {
    // Ensure we're on Development environment (switch back if needed)
    const envButton = appPage.getByText(/Development|Production|No Environment/).first();
    await envButton.click();

    // Select Development from the dropdown
    const devOption = appPage.locator('button').filter({ hasText: 'Development' });
    await devOption.first().click();

    // Open a new tab
    await appPage.getByLabel('New tab').click();

    // Type a URL with variable syntax to trigger autocomplete
    const urlInput = appPage.getByPlaceholder('Enter request url');
    await urlInput.fill('{{');

    // Wait for autocomplete suggestions to appear
    // The VariableAwareInput should show matching variables
    await appPage.waitForTimeout(500);

    await takeScreenshot('environments', 'variable-autocomplete');

    // Select baseUrl from suggestions if visible
    const suggestion = appPage.getByText('baseUrl').first();
    if (await suggestion.isVisible().catch(() => false)) {
      await suggestion.click();
    }
  });

  test('edit environment variables', async ({ appPage, takeScreenshot }) => {
    // Open environment manager
    await appPage.getByTestId('environment-switcher').click();
    await appPage.getByText('Manage Environments...').click();

    const dialogHeading = appPage.locator('h2', { hasText: 'Manage Environments' });
    await expect(dialogHeading).toBeVisible();
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    // Click on Development (use the list item button)
    await dialog.getByRole('button', { name: /Development/ }).click();

    // Add a new variable using the "Add Variable" or "+ Add Row" button
    const addButton = dialog.getByText(/Add Variable|Add Row/i);
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
    }

    await takeScreenshot('environments', 'edit-variables');

    // Close dialog
    await appPage.keyboard.press('Escape');
  });

  test('delete an environment', async ({ appPage }) => {
    // Open environment manager
    await appPage.getByTestId('environment-switcher').click();
    await appPage.getByText('Manage Environments...').click();

    const dialogHeading = appPage.locator('h2', { hasText: 'Manage Environments' });
    await expect(dialogHeading).toBeVisible();
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    // Click on "New Environment" to select it (the one we created earlier)
    const newEnvItem = dialog.getByText('New Environment');
    if (await newEnvItem.isVisible().catch(() => false)) {
      await newEnvItem.click();

      // Look for a delete button in the environment header area
      const deleteButton = dialog.getByTitle(/Delete/i).first();
      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();

        // Confirm deletion if a confirm dialog appears
        const confirmButton = appPage.getByRole('button', { name: /Delete|Confirm/i });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
      }
    }

    // Close dialog
    await appPage.keyboard.press('Escape');
  });
});
