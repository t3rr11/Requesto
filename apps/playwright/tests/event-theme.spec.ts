import { test, expect, resetData } from '../helpers/test-fixtures';

function isEventWindowNow(): boolean {
  const now = new Date();
  const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return monthDay >= '10-01' && monthDay <= '10-31';
}

test.describe('Event themes', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('shows event header decoration during the event window and honours the opt-out', async ({
    appPage,
    takeScreenshot,
  }) => {
    const expected = isEventWindowNow();
    const decoration = appPage.locator('.event-header-decoration');
    const count = await decoration.count();

    if (expected) {
      expect(count).toBe(1);
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

      // Opt out via settings — applies on Save
      await appPage.getByTitle('Settings').click();
      const checkbox = appPage.getByRole('checkbox', { name: /Disable holiday & event themes/i });
      await expect(checkbox).toBeVisible();
      await checkbox.check();
      await appPage.getByRole('button', { name: 'Save Settings' }).click();
      await expect(decoration).toHaveCount(0);
    } else {
      expect(count).toBe(0);
    }
  });
});
