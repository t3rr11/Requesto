import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCollectionsStore } from '../../store/collections/store';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('collections store', () => {
  beforeEach(() => {
    useCollectionsStore.setState({
      collections: [],
      activeCollectionId: null,
      activeRequestId: null,
      loading: false,
    });
    mockFetch.mockReset();
  });

  it('starts with empty collections', () => {
    const state = useCollectionsStore.getState();
    expect(state.collections).toEqual([]);
    expect(state.loading).toBe(false);
  });

  it('loads collections from API', async () => {
    const mockCollections = [
      { id: 'col1', name: 'My API', requests: [], folders: [] },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCollections),
    });
    await useCollectionsStore.getState().loadCollections();
    expect(useCollectionsStore.getState().collections).toEqual(mockCollections);
  });

  it('creates a collection via API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'col2', name: 'New Collection' }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 'col2', name: 'New Collection', requests: [], folders: [] }]),
    });
    await useCollectionsStore.getState().createCollection({ name: 'New Collection' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('updates a collection via API', async () => {
    useCollectionsStore.setState({
      collections: [{ id: 'col1', name: 'Old Name', requests: [], folders: [] } as any],
      activeCollectionId: null,
      activeRequestId: null,
      loading: false,
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 'col1', name: 'Updated', requests: [], folders: [] }]),
    });
    await useCollectionsStore.getState().updateCollection('col1', { name: 'Updated' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('deletes a collection via API', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    await useCollectionsStore.getState().deleteCollection('col1');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('creates a request via API', async () => {
    const request = { name: 'Test', method: 'GET', url: 'https://api.example.com' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'req1', ...request }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    await useCollectionsStore.getState().createRequest('col1', request as any);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('adds a folder via API', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    await useCollectionsStore.getState().addFolder('col1', 'Endpoints');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('handles load failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await useCollectionsStore.getState().loadCollections();
    // loadCollections catches errors internally and doesn't throw
    expect(useCollectionsStore.getState().collections).toEqual([]);
    expect(useCollectionsStore.getState().loading).toBe(false);
  });

  it('throws on create failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(
      useCollectionsStore.getState().createCollection({ name: 'Fail' }),
    ).rejects.toThrow();
  });
});
