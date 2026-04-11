import { test, expect, resetData } from '../helpers/test-fixtures';

test.describe('Collections CRUD', () => {
  test.beforeAll(() => {
    resetData();
  });

  test('app loads with pre-populated collections in sidebar', async ({ appPage, takeScreenshot }) => {
    // Verify the sidebar shows our fixture collections
    await expect(appPage.getByText('Sample API')).toBeVisible();
    await expect(appPage.getByText('GitHub API')).toBeVisible();

    await takeScreenshot('collections', 'sidebar-overview');
  });

  test('expand collection to see folders and requests', async ({ appPage, takeScreenshot }) => {
    // Click on "Sample API" to expand it
    await appPage.getByText('Sample API').click();

    // Should see the folders
    await expect(appPage.getByText('Users')).toBeVisible();
    await expect(appPage.getByText('Posts')).toBeVisible();

    // Expand the Users folder to see requests
    await appPage.getByText('Users').click();
    await expect(appPage.getByText('List Users')).toBeVisible();
    await expect(appPage.getByText('Create User')).toBeVisible();

    await takeScreenshot('collections', 'expanded-collection');
  });

  test('create a new collection', async ({ appPage, takeScreenshot }) => {
    // Click the "New Collection" button in the sidebar
    await appPage.getByTitle('New Collection').click();

    // Dialog should appear — locate by heading
    const dialogHeading = appPage.locator('h2', { hasText: 'New Collection' });
    await expect(dialogHeading).toBeVisible();
    // Get the dialog container (the rounded-xl div that wraps all dialog content)
    const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    await takeScreenshot('collections', 'new-collection-dialog');

    // Fill in the form
    await dialog.locator('#collection-name').fill('My Test Collection');
    await dialog.locator('#collection-description').fill('A collection created by Playwright tests');

    // Submit
    await dialog.getByRole('button', { name: 'Create Collection' }).click();

    // Dialog should close — heading disappears
    await expect(dialogHeading).toBeHidden();
    await expect(appPage.getByText('My Test Collection')).toBeVisible();

    // Dismiss the success alert if visible
    const okButton = appPage.getByRole('button', { name: 'OK' });
    if (await okButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await okButton.click();
    }

    await takeScreenshot('collections', 'collection-created');
  });

  test('create a folder in a collection', async ({ appPage, takeScreenshot }) => {
    // Expand our new collection
    await appPage.getByText('My Test Collection').click();

    // Hover the collection row to reveal action buttons
    const collectionText = appPage.getByText('My Test Collection');
    await collectionText.hover();
    // The New Folder button is in a sibling container, revealed on hover via CSS group-hover
    const collectionRow = appPage.locator('.group', { hasText: 'My Test Collection' }).first();
    await collectionRow.getByTitle('New Folder').click();

    // Fill in the folder name input that appears inline
    const folderInput = appPage.getByPlaceholder('Folder name...');
    await folderInput.fill('Authentication');
    await appPage.getByRole('button', { name: 'Save' }).first().click();

    // Folder should appear nested under the collection
    await expect(appPage.getByText('Authentication')).toBeVisible();

    await takeScreenshot('collections', 'folder-created');
  });

  test('rename a collection via context menu', async ({ appPage, takeScreenshot }) => {
    // Right-click the collection to open context menu
    await appPage.getByText('My Test Collection').click({ button: 'right' });

    // Click "Rename" in the context menu
    await appPage.getByText('Rename').click();

    // Rename dialog should appear — locate by heading
    const dialogHeading = appPage.locator('h2').filter({ hasText: /Rename/ });
    await expect(dialogHeading).toBeVisible();

    // Find the rename input — it should be pre-filled with the current name
    const input = appPage.getByPlaceholder('Enter collection name...');
    await input.clear();
    await input.fill('Renamed Collection');

    // Submit the form
    await appPage.getByRole('button', { name: 'Save' }).first().click();

    // Dialog closes, collection shows new name
    await expect(dialogHeading).toBeHidden();
    await expect(appPage.getByText('Renamed Collection')).toBeVisible();

    await takeScreenshot('collections', 'collection-renamed');
  });

  test('delete a collection via context menu', async ({ appPage, takeScreenshot }) => {
    // Right-click the collection to open context menu
    await appPage.getByText('Renamed Collection').click({ button: 'right' });

    // Click "Delete" in the context menu
    await appPage.getByText('Delete').first().click();

    // Confirm dialog should appear
    const deleteHeading = appPage.locator('h2', { hasText: 'Delete Collection' });
    await expect(deleteHeading).toBeVisible();
    const confirmDialog = deleteHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

    await takeScreenshot('collections', 'delete-confirm-dialog');

    // Confirm deletion
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Collection should be removed from sidebar
    await expect(appPage.getByText('Renamed Collection')).toBeHidden();
  });

  test('search and filter collections', async ({ appPage, takeScreenshot }) => {
    // Type in the search box
    const searchInput = appPage.getByPlaceholder('Search collections...');
    await searchInput.fill('GitHub');

    // Only GitHub API should be visible, Sample API should be filtered
    await expect(appPage.getByText('GitHub API')).toBeVisible();

    await takeScreenshot('collections', 'search-filter');

    // Clear search
    await searchInput.clear();

    // Both collections should be visible again
    await expect(appPage.getByText('Sample API')).toBeVisible();
    await expect(appPage.getByText('GitHub API')).toBeVisible();
  });
});
