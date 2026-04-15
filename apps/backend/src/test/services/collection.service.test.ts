import { describe, it, expect, vi } from 'vitest';
import { CollectionService } from '../../services/collection.service';
import type { CollectionRepository } from '../../repositories/collection.repository';
import type { Collection, SavedRequest, Folder } from '../../models/collection';

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    name: 'My Collection',
    folders: [],
    requests: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<SavedRequest> & { id: string }): SavedRequest {
  return {
    name: 'Test Request',
    method: 'GET',
    url: 'http://example.com',
    collectionId: 'col-1',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function mockRepo(overrides: Partial<CollectionRepository> = {}): CollectionRepository {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (c: Collection) => c),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(false),
    addRequest: vi.fn().mockResolvedValue(null),
    updateRequest: vi.fn().mockResolvedValue(null),
    deleteRequest: vi.fn().mockResolvedValue(false),
    addFolder: vi.fn().mockResolvedValue(null),
    updateFolder: vi.fn().mockResolvedValue(null),
    deleteFolder: vi.fn().mockResolvedValue(false),
    saveAll: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as CollectionRepository;
}

describe('CollectionService', () => {
  describe('getById', () => {
    it('throws notFound when collection does not exist', async () => {
      const repo = mockRepo({ getById: vi.fn().mockResolvedValue(null) });
      const service = new CollectionService(repo);
      await expect(service.getById('missing')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('returns collection when found', async () => {
      const col = makeCollection();
      const repo = mockRepo({ getById: vi.fn().mockResolvedValue(col) });
      const service = new CollectionService(repo);
      expect(await service.getById('col-1')).toBe(col);
    });
  });

  describe('create', () => {
    it('generates an id and creates the collection', async () => {
      const repo = mockRepo({
        create: vi.fn().mockImplementation(async (c: Collection) => c),
      });
      const service = new CollectionService(repo);

      const result = await service.create('My API', 'desc');
      expect(result.id).toMatch(/^col-/);
      expect(result.name).toBe('My API');
      expect(result.description).toBe('desc');
      expect(result.folders).toEqual([]);
      expect(result.requests).toEqual([]);
    });
  });

  describe('update', () => {
    it('throws notFound when collection does not exist', async () => {
      const repo = mockRepo({ update: vi.fn().mockResolvedValue(null) });
      const service = new CollectionService(repo);
      await expect(service.update('missing', { name: 'x' })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('returns updated collection', async () => {
      const col = makeCollection({ name: 'Updated' });
      const repo = mockRepo({ update: vi.fn().mockResolvedValue(col) });
      const service = new CollectionService(repo);
      expect(await service.update('col-1', { name: 'Updated' })).toBe(col);
    });
  });

  describe('delete', () => {
    it('throws notFound when not found', async () => {
      const repo = mockRepo({ delete: vi.fn().mockResolvedValue(false) });
      const service = new CollectionService(repo);
      await expect(service.delete('missing')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('succeeds when deleted', async () => {
      const repo = mockRepo({ delete: vi.fn().mockResolvedValue(true) });
      const service = new CollectionService(repo);
      await expect(service.delete('col-1')).resolves.toBeUndefined();
    });
  });

  describe('addRequest', () => {
    it('throws notFound when collection not found', async () => {
      const repo = mockRepo({ addRequest: vi.fn().mockResolvedValue(null) });
      const service = new CollectionService(repo);
      await expect(service.addRequest('missing', { name: 'r', method: 'GET', url: 'http://x.com' })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('creates request with generated id and normalized method', async () => {
      const repo = mockRepo({
        addRequest: vi.fn().mockImplementation(async (_id: string, req: SavedRequest) => req),
      });
      const service = new CollectionService(repo);
      const result = await service.addRequest('col-1', { name: 'my req', method: 'post', url: 'http://a.com' });

      expect(result.id).toMatch(/^req-/);
      expect(result.method).toBe('POST');
      expect(result.name).toBe('my req');
    });
  });

  describe('moveRequest', () => {
    it('throws notFound when source collection not found', async () => {
      const repo = mockRepo({ getById: vi.fn().mockResolvedValue(null) });
      const service = new CollectionService(repo);
      await expect(service.moveRequest({
        sourceCollectionId: 'col-1',
        requestId: 'req-1',
        targetCollectionId: 'col-2',
      })).rejects.toMatchObject({ statusCode: 404, message: 'Source collection not found' });
    });

    it('throws notFound when request not found in source', async () => {
      const col = makeCollection({ requests: [] });
      const repo = mockRepo({ getById: vi.fn().mockResolvedValue(col) });
      const service = new CollectionService(repo);
      await expect(service.moveRequest({
        sourceCollectionId: 'col-1',
        requestId: 'req-x',
        targetCollectionId: 'col-1',
      })).rejects.toMatchObject({ statusCode: 404, message: 'Request not found' });
    });

    it('moves request to target collection (different)', async () => {
      const req = makeRequest({ id: 'req-1', collectionId: 'col-1' });
      const sourceCol = makeCollection({ id: 'col-1', requests: [req] });
      const targetCol = makeCollection({ id: 'col-2', requests: [] });

      const getByIdFn = vi.fn()
        .mockResolvedValueOnce(sourceCol)   // source lookup
        .mockResolvedValueOnce(targetCol)   // target lookup (after delete)
        .mockResolvedValueOnce(targetCol);  // saveAll reload

      const savedReq = { ...req, collectionId: 'col-2' };
      const repo = mockRepo({
        getById: getByIdFn,
        deleteRequest: vi.fn().mockResolvedValue(true),
        addRequest: vi.fn().mockResolvedValue(savedReq),
      });

      const service = new CollectionService(repo);
      const result = await service.moveRequest({
        sourceCollectionId: 'col-1',
        requestId: 'req-1',
        targetCollectionId: 'col-2',
      });

      expect(result.collectionId).toBe('col-2');
      expect(repo.deleteRequest).toHaveBeenCalledWith('col-1', 'req-1');
    });

    it('assigns order 0 when target is empty', async () => {
      const req = makeRequest({ id: 'req-1', collectionId: 'col-1' });
      const sourceCol = makeCollection({ id: 'col-1', requests: [req] });
      const targetCol = makeCollection({ id: 'col-2', requests: [] });

      const getByIdFn = vi.fn()
        .mockResolvedValueOnce(sourceCol)
        .mockResolvedValueOnce(targetCol);

      const addReqFn = vi.fn().mockImplementation(async (_id: string, r: SavedRequest) => r);
      const repo = mockRepo({
        getById: getByIdFn,
        deleteRequest: vi.fn().mockResolvedValue(true),
        addRequest: addReqFn,
      });

      const service = new CollectionService(repo);
      await service.moveRequest({ sourceCollectionId: 'col-1', requestId: 'req-1', targetCollectionId: 'col-2' });

      const addedReq = addReqFn.mock.calls[0][1] as SavedRequest;
      expect(addedReq.order).toBe(0);
    });

    it('shifts existing requests when targetOrder is specified', async () => {
      const req1 = makeRequest({ id: 'req-1', collectionId: 'col-1', order: 0 });
      const req2 = makeRequest({ id: 'req-2', collectionId: 'col-1', order: 1 });
      const srcReq = makeRequest({ id: 'req-src', collectionId: 'col-src' });

      const sourceCol = makeCollection({ id: 'col-src', requests: [srcReq] });
      const targetCol = makeCollection({ id: 'col-1', requests: [req1, req2] });

      const getByIdFn = vi.fn()
        .mockResolvedValueOnce(sourceCol)
        .mockResolvedValueOnce(targetCol);

      const updateReqFn = vi.fn().mockResolvedValue({});
      const addReqFn = vi.fn().mockImplementation(async (_id: string, r: SavedRequest) => r);
      const repo = mockRepo({
        getById: getByIdFn,
        deleteRequest: vi.fn().mockResolvedValue(true),
        updateRequest: updateReqFn,
        addRequest: addReqFn,
      });

      const service = new CollectionService(repo);
      await service.moveRequest({
        sourceCollectionId: 'col-src',
        requestId: 'req-src',
        targetCollectionId: 'col-1',
        targetOrder: 0,
      });

      // Both existing requests have order >= 0 and should be shifted
      expect(updateReqFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('moveFolder', () => {
    it('throws badRequest when moving folder into itself', async () => {
      const folder = { id: 'f-1', name: 'Folder 1', collectionId: 'col-1', createdAt: 1000, updatedAt: 1000 } as Folder;
      const col = makeCollection({ folders: [folder], requests: [] });
      const repo = mockRepo({ getById: vi.fn().mockResolvedValue(col) });
      const service = new CollectionService(repo);

      await expect(service.moveFolder({
        sourceCollectionId: 'col-1',
        folderId: 'f-1',
        targetCollectionId: 'col-1',
        targetParentId: 'f-1',
      })).rejects.toMatchObject({ statusCode: 400, message: 'Cannot move a folder into itself or its descendants' });
    });
  });
});
