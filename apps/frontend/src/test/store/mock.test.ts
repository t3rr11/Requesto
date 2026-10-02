import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMockStore } from '../../store/mock/store';
import type { MockEndpoint } from '../../store/mock/types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeEndpoint(overrides: Partial<MockEndpoint> = {}): MockEndpoint {
  return {
    id: 'mep-1',
    name: 'Users API',
    path: '/api/users',
    enabled: true,
    mode: 'static',
    methods: {
      GET: { status: 200, headers: {}, contentType: 'json', body: '[]', delayMs: 0 },
    },
    ...overrides,
  };
}

describe('mock store', () => {
  beforeEach(() => {
    useMockStore.setState({
      endpoints: [],
      loading: false,
      status: { running: false, port: 0, url: null },
      selectedEndpointId: null,
      logs: [],
      error: null,
      datasetCounts: {},
    });
    mockFetch.mockReset();
  });

  it('loads endpoints from the API', async () => {
    const endpoints = [makeEndpoint()];
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(endpoints) });

    await useMockStore.getState().loadEndpoints();

    expect(useMockStore.getState().endpoints).toEqual(endpoints);
    expect(useMockStore.getState().error).toBeNull();
  });

  it('stores an error when loading fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    await useMockStore.getState().loadEndpoints();

    expect(useMockStore.getState().error).toBe('Failed to fetch mock endpoints');
  });

  it('creates an endpoint, appends it and selects it', async () => {
    const created = makeEndpoint();
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(created) });

    await useMockStore.getState().createEndpoint({ name: 'Users API', path: '/api/users' });

    const state = useMockStore.getState();
    expect(state.endpoints).toEqual([created]);
    expect(state.selectedEndpointId).toBe('mep-1');

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.methods.GET.status).toBe(200);
  });

  it('updates an endpoint in place', async () => {
    const endpoint = makeEndpoint();
    useMockStore.setState({ endpoints: [endpoint] });
    const updated = { ...endpoint, name: 'Renamed' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updated) });

    await useMockStore.getState().updateEndpoint('mep-1', { name: 'Renamed' });

    expect(useMockStore.getState().endpoints[0].name).toBe('Renamed');
  });

  it('deletes an endpoint and clears the selection', async () => {
    useMockStore.setState({ endpoints: [makeEndpoint()], selectedEndpointId: 'mep-1' });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

    await useMockStore.getState().deleteEndpoint('mep-1');

    expect(useMockStore.getState().endpoints).toEqual([]);
    expect(useMockStore.getState().selectedEndpointId).toBeNull();
  });

  it('reports failure when deleting an endpoint fails', async () => {
    useMockStore.setState({ endpoints: [makeEndpoint()] });
    mockFetch.mockResolvedValueOnce({ ok: false });

    await expect(useMockStore.getState().deleteEndpoint('mep-1')).resolves.toBe(false);
    expect(useMockStore.getState().endpoints).toHaveLength(1);
  });

  it('duplicates an endpoint and appends the copy', async () => {
    useMockStore.setState({ endpoints: [makeEndpoint()] });
    const copy = makeEndpoint({ id: 'mep-2', name: 'Users API Copy' });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(copy) });

    await expect(useMockStore.getState().duplicateEndpoint('mep-1')).resolves.toBe(true);

    const endpoints = useMockStore.getState().endpoints;
    expect(endpoints.map((e) => e.id)).toEqual(['mep-1', 'mep-2']);

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
  });

  it('reorders endpoints optimistically against the returned ids', async () => {
    const a = makeEndpoint({ id: 'mep-1' });
    const b = makeEndpoint({ id: 'mep-2' });
    useMockStore.setState({ endpoints: [a, b] });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

    await useMockStore.getState().reorderEndpoints(['mep-2', 'mep-1']);

    expect(useMockStore.getState().endpoints.map((e) => e.id)).toEqual(['mep-2', 'mep-1']);
  });

  it('keeps the last known status when the status check fails', async () => {
    const running = { running: true, port: 4748, url: 'http://localhost:4748' };
    useMockStore.setState({ status: running });
    mockFetch.mockRejectedValueOnce(new Error('network down'));

    await useMockStore.getState().refreshStatus();

    expect(useMockStore.getState().status).toEqual(running);
  });

  it('loads the request log', async () => {
    const logs = [
      { id: 'mlog-1', timestamp: 1, method: 'GET', path: '/api/users', status: 200, endpointName: 'Users API', durationMs: 2 },
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(logs) });

    await useMockStore.getState().loadLogs();

    expect(useMockStore.getState().logs).toEqual(logs);
  });

  it('clears the request log locally and on the backend', async () => {
    useMockStore.setState({
      logs: [{ id: 'mlog-1', timestamp: 1, method: 'GET', path: '/api/users', status: 200, endpointName: null, durationMs: 1 }],
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

    useMockStore.getState().clearLogs();

    expect(useMockStore.getState().logs).toEqual([]);
  });

  it('refreshes the dataset count for an endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: '1' }, { id: '2' }]) });

    await useMockStore.getState().refreshDatasetCount('mep-1');

    expect(useMockStore.getState().datasetCounts['mep-1']).toBe(2);
  });

  it('saves endpoint data through the dataset PUT and updates the count', async () => {
    useMockStore.setState({ datasetCounts: {} });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

    const records = [{ id: '1', name: 'Carol' }];
    await expect(useMockStore.getState().updateDataset('mep-1', records)).resolves.toBe(true);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/mock/endpoints/mep-1/data');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual(records);
    expect(useMockStore.getState().datasetCounts['mep-1']).toBe(1);
  });

  it('surfaces dataset save errors', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'boom' }) });

    await expect(useMockStore.getState().updateDataset('mep-1', [])).resolves.toBe(false);
    expect(useMockStore.getState().error).toBe('boom');
  });

  it('clears endpoint data and zeroes the count', async () => {
    useMockStore.setState({ datasetCounts: { 'mep-1': 3 } });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

    await expect(useMockStore.getState().clearEndpointData('mep-1')).resolves.toBe(true);

    expect(useMockStore.getState().datasetCounts['mep-1']).toBe(0);
  });
});
