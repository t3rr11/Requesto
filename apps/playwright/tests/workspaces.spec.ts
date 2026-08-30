import { test, expect, resetData } from '../helpers/test-fixtures';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Workspace creation and management flows, including opening an existing
 * project folder (typed server-side path, since e2e runs in a browser).
 */

const OPEN_FIXTURE_DIR = path.resolve(__dirname, '..', 'open-fixture');
const PROJECT_A_DIR = path.join(OPEN_FIXTURE_DIR, 'project-a');
const EMPTY_DIR = path.join(OPEN_FIXTURE_DIR, 'empty-dir');

/**
 * Create a project folder that already contains a Requesto workspace.
 * Uses the pre-split monolithic layout on purpose — opening it exercises
 * the automatic migration to per-item files on the backend.
 */
function createProjectAFixture() {
  const requestoDir = path.join(PROJECT_A_DIR, '.requesto');
  fs.mkdirSync(requestoDir, { recursive: true });
  fs.writeFileSync(
    path.join(requestoDir, 'collections.json'),
    JSON.stringify([
      {
        id: 'col-project-a',
        name: 'Project A API',
        description: 'Collection living inside a project repo',
        folders: [],
        requests: [
          {
            id: 'req-project-a-ping',
            name: 'Ping',
            method: 'GET',
            url: '{{baseUrl}}/ping',
            collectionId: 'col-project-a',
            order: 0,
            auth: { type: 'none' },
          },
        ],
      },
    ]),
    'utf-8',
  );
  fs.writeFileSync(
    path.join(requestoDir, 'environments.json'),
    JSON.stringify({
      activeEnvironmentId: 'env-project-a',
      environments: [
        {
          id: 'env-project-a',
          name: 'Dev',
          variables: [{ key: 'baseUrl', value: 'https://api.project-a.test', enabled: true }],
        },
      ],
    }),
    'utf-8',
  );
  fs.writeFileSync(path.join(requestoDir, 'oauth-configs.json'), JSON.stringify({ configs: [] }), 'utf-8');
}

/** Open the Add Workspace dialog from the header switcher */
async function openAddWorkspaceDialog(page: import('@playwright/test').Page) {
  await page.getByTestId('workspace-switcher').click();
  await page.getByText('Add Workspace...').click();
  await expect(page.locator('h2', { hasText: 'Add Workspace' })).toBeVisible();
}

test.describe('Workspaces', () => {
  test.beforeAll(() => {
    resetData();
    fs.rmSync(OPEN_FIXTURE_DIR, { recursive: true, force: true });
    createProjectAFixture();
    fs.mkdirSync(EMPTY_DIR, { recursive: true });
  });

  test.afterAll(() => {
    fs.rmSync(OPEN_FIXTURE_DIR, { recursive: true, force: true });
  });

  test('mode cards switch the visible form fields', async ({ appPage }) => {
    await openAddWorkspaceDialog(appPage);

    // Create mode: just a name
    await expect(appPage.locator('#workspace-name')).toBeVisible();
    await expect(appPage.locator('#workspace-path')).toHaveCount(0);

    // Open Folder mode: name + folder path
    await appPage.getByTestId('workspace-mode-open').click();
    await expect(appPage.locator('#workspace-path')).toBeVisible();

    // Clone mode: repo URL + token
    await appPage.getByTestId('workspace-mode-clone').click();
    await expect(appPage.locator('#repo-url')).toBeVisible();
    await expect(appPage.locator('#workspace-path')).toHaveCount(0);

    // Import mode: file input, no name field
    await appPage.getByTestId('workspace-mode-import').click();
    await expect(appPage.locator('#workspace-import-file')).toBeVisible();
    await expect(appPage.locator('#workspace-name')).toHaveCount(0);
  });

  test('warns when the typed folder does not exist', async ({ appPage }) => {
    await openAddWorkspaceDialog(appPage);
    await appPage.getByTestId('workspace-mode-open').click();

    const missingPath = path.join(OPEN_FIXTURE_DIR, 'does-not-exist');
    await appPage.locator('#workspace-path').fill(missingPath);

    const preview = appPage.getByTestId('workspace-folder-preview');
    await expect(preview).toContainText('Directory not found', { timeout: 10_000 });
  });

  test('hints that a folder without Requesto data will get a new workspace', async ({ appPage }) => {
    await openAddWorkspaceDialog(appPage);
    await appPage.getByTestId('workspace-mode-open').click();

    await appPage.locator('#workspace-path').fill(EMPTY_DIR);

    const preview = appPage.getByTestId('workspace-folder-preview');
    await expect(preview).toContainText('No Requesto data here yet', { timeout: 10_000 });
  });

  test('opens an existing project folder as a workspace via typed path', async ({ page }) => {
    // These tests change the active workspace, so use plain page navigation
    // (appPage waits for sample data that won't exist in other workspaces)
    await page.goto('/');
    await page.waitForSelector('text=Collections', { timeout: 15_000 });

    await openAddWorkspaceDialog(page);
    await page.getByTestId('workspace-mode-open').click();

    // Typing the path triggers the live preview; the name is auto-suggested
    await page.locator('#workspace-path').fill(PROJECT_A_DIR);
    const preview = page.getByTestId('workspace-folder-preview');
    await expect(preview).toContainText('Requesto workspace found', { timeout: 10_000 });
    await expect(preview).toContainText('1 collection');

    await expect(page.locator('#workspace-name')).toHaveValue('project-a');

    await page.getByRole('button', { name: 'Add Workspace' }).click();

    // The new workspace is activated and the app reloads with its collections
    await expect(page.getByText('Project A API')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('button[title="project-a"]')).toBeVisible();

    // Opening the workspace migrated the monolithic files into per-item files
    await expect
      .poll(() => fs.existsSync(path.join(PROJECT_A_DIR, '.requesto', 'collections', 'project-a-api.json')))
      .toBe(true);
    expect(fs.existsSync(path.join(PROJECT_A_DIR, '.requesto', 'collections.json'))).toBe(false);
  });

  test('creates a new empty workspace and switches to it', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Collections', { timeout: 15_000 });

    await openAddWorkspaceDialog(page);

    await page.locator('#workspace-name').fill('E2E Created');
    await page.getByRole('button', { name: 'Create Workspace' }).click();

    await expect(page.locator('button[title="E2E Created"]')).toBeVisible({ timeout: 15_000 });
  });
});
