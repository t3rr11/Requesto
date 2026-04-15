import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCollectionsStore } from '../../store/collections/store';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('collections store – OpenAPI actions', () => {
  beforeEach(() => {
    useCollectionsStore.setState({
      collections: [],
      activeCollectionId: null,
      activeRequestId: null,
      loading: false,
    });
    mockFetch.mockReset();
  });

  describe('importOpenApiCollection', () => {
    it('sends POST to import-openapi and reloads collections', async () => {
      const mockCollection = {
        id: 'col1',
        name: 'Pet Store',
        requests: [{ id: 'r1', name: 'List Pets' }],
        folders: [{ id: 'f1', name: 'pets' }],
      };
      // First call: import
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ collection: mockCollection, environments: [] }),
      });
      // Second call: loadCollections
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockCollection]),
      });

      const result = await useCollectionsStore.getState().importOpenApiCollection({
        source: '/path/to/spec.json',
        name: 'Pet Store',
        linkSpec: true,
      });

      expect(result).toEqual(mockCollection);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain('/collections/import-openapi');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.source).toBe('/path/to/spec.json');
      expect(body.name).toBe('Pet Store');
      expect(body.linkSpec).toBe(true);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid spec format' }),
      });

      await expect(
        useCollectionsStore.getState().importOpenApiCollection({ source: 'bad' }),
      ).rejects.toThrow('Invalid spec format');
    });

    it('throws default message when API returns no error body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('no json')),
      });

      await expect(
        useCollectionsStore.getState().importOpenApiCollection({ source: 'bad' }),
      ).rejects.toThrow('Failed to import OpenAPI spec');
    });
  });

  describe('syncPreview', () => {
    it('sends POST to sync-openapi/preview and returns result', async () => {
      const previewResult = {
        added: [{ operationId: 'deletePet', request: { name: 'Delete Pet' }, folderName: 'pets' }],
        updated: [],
        orphaned: [],
        unchangedCount: 4,
        newSpecHash: 'abc123',
        newFolders: [],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(previewResult),
      });

      const result = await useCollectionsStore.getState().syncPreview('col1');

      expect(result).toEqual(previewResult);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain('/collections/col1/sync-openapi/preview');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'No spec linked' }),
      });

      await expect(
        useCollectionsStore.getState().syncPreview('col1'),
      ).rejects.toThrow('No spec linked');
    });
  });

  describe('syncApply', () => {
    it('sends POST with selection body and reloads collections', async () => {
      const applyBody = {
        addedOperationIds: ['deletePet'],
        updatedRequestIds: ['r2'],
        removeRequestIds: [],
      };
      // Apply call
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      // loadCollections call
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      await useCollectionsStore.getState().syncApply('col1', applyBody);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain('/collections/col1/sync-openapi/apply');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.addedOperationIds).toEqual(['deletePet']);
      expect(body.updatedRequestIds).toEqual(['r2']);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Collection not found' }),
      });

      await expect(
        useCollectionsStore.getState().syncApply('col1', {
          addedOperationIds: [],
          updatedRequestIds: [],
          removeRequestIds: [],
        }),
      ).rejects.toThrow('Collection not found');
    });
  });

  describe('unlinkSpec', () => {
    it('sends DELETE to openapi-link and reloads collections', async () => {
      // Unlink call
      mockFetch.mockResolvedValueOnce({ ok: true });
      // loadCollections call
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      await useCollectionsStore.getState().unlinkSpec('col1');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain('/collections/col1/openapi-link');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'No spec linked' }),
      });

      await expect(
        useCollectionsStore.getState().unlinkSpec('col1'),
      ).rejects.toThrow('No spec linked');
    });
  });
});
