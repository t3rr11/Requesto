import { test, expect, resetData, openMockServer, BACKEND_URL, MOCK_URL } from '../helpers/test-fixtures';

/**
 * Mock Server: creating endpoints in the UI and verifying what the mock
 * server actually serves over HTTP.
 */

test.describe('Mock Server - creating endpoints', () => {
  test.beforeEach(() => {
    resetData();
  });

  test('shows the empty state when there are no endpoints', async ({ appPage, takeScreenshot }) => {
    await openMockServer(appPage);

    await expect(appPage.getByText('Create your first mock endpoint')).toBeVisible();
    await takeScreenshot('mock-server', 'empty-state');
  });

  test('creates a static endpoint that is served immediately', async ({ appPage, request, takeScreenshot }) => {
    await openMockServer(appPage);
    await appPage.getByRole('button', { name: 'Create Endpoint' }).click();

    await appPage.locator('#mock-endpoint-name').fill('Ping');
    await appPage.locator('#mock-endpoint-path').fill('/ping');
    await appPage.locator('form').getByRole('button', { name: 'Create Endpoint' }).click();

    await expect(appPage.getByPlaceholder('Untitled Endpoint')).toHaveValue('Ping');
    await expect(appPage.getByTitle('Mock server base URL')).toHaveText(MOCK_URL);
    await takeScreenshot('mock-server', 'static-endpoint-created');

    const response = await request.get(`${MOCK_URL}/ping`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('creates a dynamic endpoint with CRUD routes', async ({ appPage, request, takeScreenshot }) => {
    await openMockServer(appPage);
    await appPage.getByRole('button', { name: 'Create Endpoint' }).click();

    const dialog = appPage.locator('form');
    await dialog.getByRole('button', { name: 'Dynamic' }).click();
    await appPage.locator('#mock-endpoint-name').fill('Notes');
    await appPage.locator('#mock-endpoint-path').fill('/api/notes');
    await dialog.getByRole('button', { name: 'Create Endpoint' }).click();

    await expect(appPage.getByText('Routes are handled automatically')).toBeVisible();
    await takeScreenshot('mock-server', 'dynamic-endpoint-created');

    const created = await request.post(`${MOCK_URL}/api/notes`, { data: { title: 'First note' } });
    expect(created.status()).toBe(201);
    const note = await created.json();
    expect(note).toMatchObject({ title: 'First note' });
    expect(note.id).toBeTruthy();

    const fetched = await request.get(`${MOCK_URL}/api/notes/${note.id}`);
    expect(fetched.status()).toBe(200);
    expect(await fetched.json()).toMatchObject({ title: 'First note' });
  });
});

test.describe('Mock Server - serving responses', () => {
  test.beforeEach(() => {
    resetData({ mock: true });
  });

  test('static endpoints return the configured response', async ({ appPage, request }) => {
    // The server reads endpoints from disk per request; the page load just ensures the backend is ready
    await expect(appPage.getByText('Sample API')).toBeVisible();

    const health = await request.get(`${MOCK_URL}/health`);
    expect(health.status()).toBe(200);
    expect(health.headers()['cache-control']).toBe('no-store');
    expect(await health.json()).toMatchObject({ status: 'ok' });

    const order = await request.post(`${MOCK_URL}/api/orders`, { data: { item: 'Keyboard' } });
    expect(order.status()).toBe(201);
    expect(order.headers()['location']).toBe('/api/orders/1003');
  });

  test('unconfigured methods return 405 and unknown paths return 404', async ({ appPage, request }) => {
    await expect(appPage.getByText('Sample API')).toBeVisible();

    const wrongMethod = await request.put(`${MOCK_URL}/api/orders`, { data: {} });
    expect(wrongMethod.status()).toBe(405);
    expect(wrongMethod.headers()['allow']).toContain('GET');

    const unknown = await request.get(`${MOCK_URL}/api/nothing-here`);
    expect(unknown.status()).toBe(404);
  });

  test('dynamic endpoints support list, filter, create, update and delete', async ({ appPage, request }) => {
    await expect(appPage.getByText('Sample API')).toBeVisible();

    const list = await request.get(`${MOCK_URL}/api/users`);
    expect(await list.json()).toHaveLength(4);

    const editors = await request.get(`${MOCK_URL}/api/users?role=editor`);
    expect(await editors.json()).toHaveLength(2);

    const one = await request.get(`${MOCK_URL}/api/users/1`);
    expect(await one.json()).toMatchObject({ name: 'Ada Lovelace' });

    const created = await request.post(`${MOCK_URL}/api/users`, { data: { id: 10, name: 'Margaret Hamilton' } });
    expect(created.status()).toBe(201);

    const replaced = await request.put(`${MOCK_URL}/api/users/10`, { data: { name: 'Margaret H.' } });
    expect(await replaced.json()).toEqual({ id: '10', name: 'Margaret H.' });

    const patched = await request.patch(`${MOCK_URL}/api/users/10`, { data: { role: 'admin' } });
    expect(await patched.json()).toEqual({ id: '10', name: 'Margaret H.', role: 'admin' });

    const removed = await request.delete(`${MOCK_URL}/api/users/10`);
    expect(removed.status()).toBe(200);

    const missing = await request.get(`${MOCK_URL}/api/users/10`);
    expect(missing.status()).toBe(404);
  });

  test('requests appear in the mock request log', async ({ appPage, request }) => {
    await expect(appPage.getByText('Sample API')).toBeVisible();
    await request.delete(`${BACKEND_URL}/api/mock/logs`);

    await request.get(`${MOCK_URL}/health`);

    const logs = await (await request.get(`${BACKEND_URL}/api/mock/logs`)).json();
    expect(logs).toEqual([expect.objectContaining({ method: 'GET', path: '/health', status: 200, endpointName: 'Health Check' })]);
  });
});

test.describe('Mock Server - managing endpoints', () => {
  test.beforeEach(() => {
    resetData({ mock: true });
  });

  test('disabling an endpoint stops it being served until it is enabled again', async ({ appPage, request }) => {
    await openMockServer(appPage);

    await appPage.locator('button', { hasText: 'Health Check' }).first().click({ button: 'right' });
    await appPage.getByText('Disable', { exact: true }).click();
    await expect.poll(async () => (await request.get(`${MOCK_URL}/health`)).status()).toBe(404);

    await appPage.locator('button', { hasText: 'Health Check' }).first().click({ button: 'right' });
    await appPage.getByText('Enable', { exact: true }).click();
    await expect.poll(async () => (await request.get(`${MOCK_URL}/health`)).status()).toBe(200);
  });

  test('saving a changed status code updates the served response', async ({ appPage, request }) => {
    await openMockServer(appPage);

    await appPage.locator('button', { hasText: 'Health Check' }).first().click();
    await expect(appPage.getByPlaceholder('Untitled Endpoint')).toHaveValue('Health Check');

    await appPage.getByLabel('Status').fill('503');
    await appPage.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(appPage.getByText('Endpoint saved')).toBeVisible();

    const response = await request.get(`${MOCK_URL}/health`);
    expect(response.status()).toBe(503);
  });

  test('duplicating an endpoint adds a copy to the sidebar', async ({ appPage }) => {
    await openMockServer(appPage);

    await appPage.locator('button', { hasText: 'Orders' }).first().click({ button: 'right' });
    await appPage.getByText('Duplicate', { exact: true }).click();

    await expect(appPage.locator('button', { hasText: 'Orders Copy' })).toBeVisible();
  });
});
