import { Page } from '@playwright/test';
import { test, expect, resetData } from '../helpers/test-fixtures';

async function openAppearanceSettings(appPage: Page) {
  await appPage.getByTitle('Settings').click();
  await appPage.getByRole('button', { name: 'Appearance' }).click();
}

test.describe('Event themes', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('forces the event theme on via the Appearance override and honours the opt-out', async ({
    appPage,
    takeScreenshot,
  }) => {
    // Force the Halloween theme on regardless of the current date
    await openAppearanceSettings(appPage);
    await appPage.getByLabel('Holiday theme').selectOption('halloween');
    await appPage.getByRole('button', { name: 'Save Settings' }).click();

    const decoration = appPage.locator('.event-header-decoration');
    await expect(decoration).toHaveCount(1);
    await takeScreenshot('events', 'halloween-header-dark');

    // Close-up of the decorated header
    await takeScreenshot('events', 'halloween-header-closeup');

    // Light mode
    const lightToggle = appPage.getByTitle('Switch to Light Mode');
    if (await lightToggle.isVisible().catch(() => false)) {
      await lightToggle.click();
      await appPage.waitForTimeout(300);
      await takeScreenshot('events', 'halloween-header-light');
      await appPage.getByTitle('Switch to Dark Mode').click();
      await appPage.waitForTimeout(300);
    }

    // The opt-out takes precedence over the override
    await openAppearanceSettings(appPage);
    const checkbox = appPage.getByRole('checkbox', { name: /Disable holiday & event themes/i });
    await expect(checkbox).toBeVisible();
    await checkbox.check();
    await appPage.getByRole('button', { name: 'Save Settings' }).click();
    await expect(decoration).toHaveCount(0);

    // Reset to auto with the opt-out off so later tests start from defaults
    await openAppearanceSettings(appPage);
    await checkbox.uncheck();
    await appPage.getByLabel('Holiday theme').selectOption('');
    await appPage.getByRole('button', { name: 'Save Settings' }).click();
  });
});
