import { test, expect, resetData } from '../helpers/test-fixtures';
import type { Page } from '@playwright/test';

async function openGraphQLRequest(page: Page) {
  await page.getByText('GraphQL API').click();
  const request = page.locator('[data-request-item]').filter({
    has: page.getByLabel('GraphQL request'),
  });
  await request.click();
  await expect(page.getByLabel('Request method or type')).toHaveValue('graphql:post');
}

test.describe('GraphQL requests', () => {
  test.beforeAll(() => resetData());

  test('saved request loads schema and executes with variables', async ({ appPage }) => {
    await openGraphQLRequest(appPage);

    await expect(appPage.getByLabel('Refresh GraphQL schema')).toBeVisible({ timeout: 15_000 });

    await appPage.getByRole('button', { name: 'Variables' }).click();
    const variablesEditor = appPage.locator('.monaco-editor').first();
    await expect(variablesEditor).toBeVisible();
    await expect(variablesEditor).toContainText('"id": "1"');

    await appPage.getByRole('button', { name: 'Query' }).click();
    await appPage.getByRole('button', { name: 'Send' }).click();
    await expect(appPage.getByText('200 OK')).toBeVisible({ timeout: 15_000 });
    await expect(appPage.locator('.monaco-editor').last()).toContainText('Ada Lovelace');
  });

  test('schema explorer shows operations and types', async ({ appPage }) => {
    await openGraphQLRequest(appPage);
    await expect(appPage.getByLabel('Refresh GraphQL schema')).toBeVisible({ timeout: 15_000 });

    await appPage.getByLabel('View GraphQL schema').click();
    await expect(appPage.getByRole('heading', { name: 'GraphQL Schema' })).toBeVisible();
    await expect(appPage.getByLabel('Schema profile', { exact: true })).toHaveValue('gql-schema-test-api');
    await expect(appPage.getByText('Operations')).toBeVisible();
    await expect(appPage.getByRole('button', { name: 'User' }).first()).toBeVisible();
  });

  test('partial responses expose structured GraphQL errors', async ({ appPage }) => {
    await openGraphQLRequest(appPage);
    const editor = appPage.locator('.monaco-editor').first();
    await editor.click();
    await appPage.keyboard.press('Control+a');
    await appPage.keyboard.insertText('query Partial { users { id name } fieldError }');

    await appPage.getByRole('button', { name: 'Send' }).click();
    await expect(appPage.getByText('Partial data')).toBeVisible({ timeout: 15_000 });
    await appPage.getByRole('button', { name: 'Errors (1)' }).click();
    await expect(appPage.getByText('This field intentionally failed')).toBeVisible();
    await expect(appPage.getByText('Path: fieldError')).toBeVisible();
  });
});
