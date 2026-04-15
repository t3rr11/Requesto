import { test, expect, resetData } from '../helpers/test-fixtures';
import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const TEST_DATA_DIR = path.resolve(__dirname, '..', 'test-data');

test.describe('OpenAPI Import & Sync', () => {
  test.beforeAll(() => {
    resetData();
  });

  test.describe('Phase 1: Import', () => {
    test('import OpenAPI spec via UI', async ({ appPage, takeScreenshot }) => {
      const specPath = path.join(FIXTURES_DIR, 'openapi-spec.json').replace(/\\/g, '/');

      // Open the import dropdown, then click "OpenAPI Spec"
      await appPage.getByTitle('Import').click();
      await appPage.getByText('OpenAPI Spec').click();

      const dialogHeading = appPage.locator('h2', { hasText: 'Import from OpenAPI' });
      await expect(dialogHeading).toBeVisible();
      const dialog = dialogHeading.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');

      // Fill in the spec source
      await dialog.locator('#openapi-source').fill(specPath);

      await takeScreenshot('openapi', 'import-dialog-filled');

      // Submit the form
      await dialog.getByRole('button', { name: 'Import' }).click();

      // Wait for the import to complete — collection should appear in sidebar
      await expect(appPage.getByText('Playwright Test API')).toBeVisible({ timeout: 15_000 });

      await takeScreenshot('openapi', 'after-import');
    });

    test('imported collection has correct structure', async ({ appPage }) => {
      // Expand the collection
      await appPage.getByText('Playwright Test API').click();

      // Should see folders from tags
      await expect(appPage.getByText('pets')).toBeVisible();
      await expect(appPage.getByText('users')).toBeVisible();

      // Expand the pets folder
      await appPage.getByText('pets').click();

      // Should see requests
      await expect(appPage.getByText('List all pets')).toBeVisible();
      await expect(appPage.getByText('Create a pet')).toBeVisible();
      await expect(appPage.getByText('Get a pet by ID')).toBeVisible();
    });

    test('clicking a request shows correct method and URL', async ({ appPage, takeScreenshot }) => {
      // Click on "Get a pet by ID"
      await appPage.getByText('Get a pet by ID').click();

      // Should see the request details with placeholder URL
      await expect(appPage.locator('input[type="text"]').first()).toHaveValue(
        /\{\{baseUrl\}\}\/pets\/\{\{petId\}\}/,
      );

      await takeScreenshot('openapi', 'imported-request-details');
    });
  });

  test.describe('Phase 2: Sync', () => {
    test('sync detects new operations added to spec', async ({ appPage, takeScreenshot }) => {
      // Replace the spec file with the updated version (has deletePet added)
      const updatedSpec = path.join(FIXTURES_DIR, 'openapi-spec-v2.json');
      const originalSpec = path.join(FIXTURES_DIR, 'openapi-spec.json');
      fs.copyFileSync(updatedSpec, originalSpec);

      // Right-click the collection for context menu
      await appPage.getByText('Playwright Test API').click({ button: 'right' });

      // Click "Sync from Spec"
      await appPage.getByText('Sync from Spec').click();

      // Wait for sync preview dialog
      const syncDialog = appPage.locator('h2', { hasText: 'Sync from OpenAPI Spec' });
      await expect(syncDialog).toBeVisible({ timeout: 15_000 });

      await takeScreenshot('openapi', 'sync-preview-new-operation');

      // Should show the new request (deletePet)
      await expect(appPage.getByText('Delete a pet')).toBeVisible();

      // Apply changes
      await appPage.getByRole('button', { name: 'Apply Changes' }).click();

      // The dialog should close
      await expect(syncDialog).not.toBeVisible({ timeout: 10_000 });

      // Expand the pets folder to verify new request is there
      // It might already be expanded, get the request directly
      await expect(appPage.getByText('Delete a pet')).toBeVisible({ timeout: 10_000 });

      await takeScreenshot('openapi', 'after-sync-new-operation');
    });

    test('unlink spec removes spec metadata', async ({ appPage, takeScreenshot }) => {
      // Right-click the collection
      await appPage.getByText('Playwright Test API').click({ button: 'right' });

      // Click "Unlink Spec"
      await appPage.getByText('Unlink Spec').click();

      // Should show success alert
      await expect(appPage.getByText('Spec unlinked')).toBeVisible({ timeout: 5_000 });

      await takeScreenshot('openapi', 'after-unlink');

      // Verify Sync from Spec is no longer in context menu
      await appPage.getByText('Playwright Test API').click({ button: 'right' });
      await expect(appPage.getByText('Sync from Spec')).not.toBeVisible();
    });
  });

  test.afterAll(() => {
    // Restore the original spec file
    const originalContent = {
      openapi: '3.0.3',
      info: { title: 'Playwright Test API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com/v1' }],
      paths: {
        '/pets': {
          get: {
            tags: ['pets'], summary: 'List all pets', operationId: 'listPets',
            parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }],
            responses: { '200': { description: 'A list of pets' } },
          },
          post: {
            tags: ['pets'], summary: 'Create a pet', operationId: 'createPet',
            requestBody: {
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { name: { type: 'string' }, species: { type: 'string' } } },
                },
              },
            },
            responses: { '201': { description: 'Pet created' } },
          },
        },
        '/pets/{petId}': {
          get: {
            tags: ['pets'], summary: 'Get a pet by ID', operationId: 'getPet',
            parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'integer' } }],
            responses: { '200': { description: 'A pet' } },
          },
        },
        '/users': {
          get: {
            tags: ['users'], summary: 'List users', operationId: 'listUsers',
            responses: { '200': { description: 'User list' } },
          },
        },
      },
    };
    const specPath = path.join(FIXTURES_DIR, 'openapi-spec.json');
    fs.writeFileSync(specPath, JSON.stringify(originalContent, null, 2));
  });
});
