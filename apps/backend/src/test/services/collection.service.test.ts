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
    ...overrides,
  };
}

function makeRequest(overrides: Partial<SavedRequest> & { id: string }): SavedRequest {
  return {
    name: 'Test Request',
    method: 'GET',
    url: 'http://example.com',
    collectionId: 'col-1',
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

    it('persists auth, bodyType, and formDataEntries through to the repo (Bug A regression)', async () => {
      const captured: SavedRequest[] = [];
      const repo = mockRepo({
        addRequest: vi.fn().mockImplementation(async (_id: string, req: SavedRequest) => {
          captured.push(req);
          return req;
        }),
      });
      const service = new CollectionService(repo);

      await service.addRequest('col-1', {
        name: 'auth-req',
        method: 'POST',
        url: 'http://a.com',
        bodyType: 'form-data',
        formDataEntries: [
          { id: '1', key: 'file', value: '', type: 'file', enabled: true, fileName: 'x.png', fileContent: 'data:image/png;base64,abc' },
        ],
        auth: { type: 'bearer', bearer: { token: 'sekret' } },
      });

      expect(captured).toHaveLength(1);
      expect(captured[0].auth).toEqual({ type: 'bearer', bearer: { token: 'sekret' } });
      expect(captured[0].bodyType).toBe('form-data');
      expect(captured[0].formDataEntries).toHaveLength(1);
    });
  });

  describe('ensureUncategorizedCollection', () => {
    it('creates the system collection on first call', async () => {
      const created: Collection[] = [];
      const repo = mockRepo({
        getById: vi.fn().mockResolvedValue(undefined),
        create: vi.fn().mockImplementation(async (c: Collection) => { created.push(c); return c; }),
      });
      const service = new CollectionService(repo);

      const result = await service.ensureUncategorizedCollection();

      expect(result.id).toBe('uncategorized');
      expect(result.isSystem).toBe(true);
      expect(result.name).toBe('Uncategorized');
      expect(created).toHaveLength(1);
    });

    it('is idempotent — does not recreate when it already exists', async () => {
      const existing = makeCollection({ id: 'uncategorized', name: 'Uncategorized', isSystem: true });
      const createSpy = vi.fn();
      const repo = mockRepo({
        getById: vi.fn().mockResolvedValue(existing),
        create: createSpy,
      });
      const service = new CollectionService(repo);

      const result = await service.ensureUncategorizedCollection();

      expect(result).toBe(existing);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('addRequest auto-creates Uncategorized when collectionId is "uncategorized"', async () => {
      const created: Collection[] = [];
      let store: Collection | null = null;
      const repo = mockRepo({
        getById: vi.fn().mockImplementation(async () => store ?? undefined),
        create: vi.fn().mockImplementation(async (c: Collection) => { created.push(c); store = c; return c; }),
        addRequest: vi.fn().mockImplementation(async (_id: string, req: SavedRequest) => req),
      });
      const service = new CollectionService(repo);

      const result = await service.addRequest('uncategorized', { name: 'r', method: 'GET', url: 'http://x.com' });

      expect(result.id).toMatch(/^req-/);
      expect(created).toHaveLength(1);
      expect(created[0].id).toBe('uncategorized');
    });
  });

  describe('system collection guards', () => {
    it('refuses to rename the Uncategorized collection', async () => {
      const repo = mockRepo();
      const service = new CollectionService(repo);
      await expect(service.update('uncategorized', { name: 'foo' })).rejects.toMatchObject({ statusCode: 400 });
    });

    it('refuses to delete the Uncategorized collection', async () => {
      const repo = mockRepo();
      const service = new CollectionService(repo);
      await expect(service.delete('uncategorized')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('moveRequest', () => {
    it('throws notFound when source collection not found', async () => {
      const repo = mockRepo({ getAll: vi.fn().mockResolvedValue([]) });
      const service = new CollectionService(repo);
      await expect(service.moveRequest({
        sourceCollectionId: 'col-1',
        requestId: 'req-1',
        targetCollectionId: 'col-2',
      })).rejects.toMatchObject({ statusCode: 404, message: 'Source collection not found' });
    });

    it('throws notFound when request not found in source', async () => {
      const col = makeCollection({ id: 'col-1', requests: [] });
      const repo = mockRepo({ getAll: vi.fn().mockResolvedValue([col]) });
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

      const saveAllFn = vi.fn().mockResolvedValue(undefined);
      const repo = mockRepo({
        getAll: vi.fn().mockResolvedValue([sourceCol, targetCol]),
        saveAll: saveAllFn,
      });

      const service = new CollectionService(repo);
      const result = await service.moveRequest({
        sourceCollectionId: 'col-1',
        requestId: 'req-1',
        targetCollectionId: 'col-2',
      });

      expect(result.collectionId).toBe('col-2');
      expect(saveAllFn).toHaveBeenCalledTimes(1);
    });

    it('assigns order 0 when target is empty', async () => {
      const req = makeRequest({ id: 'req-1', collectionId: 'col-1' });
      const sourceCol = makeCollection({ id: 'col-1', requests: [req] });
      const targetCol = makeCollection({ id: 'col-2', requests: [] });

      const saveAllFn = vi.fn().mockResolvedValue(undefined);
      const repo = mockRepo({
        getAll: vi.fn().mockResolvedValue([sourceCol, targetCol]),
        saveAll: saveAllFn,
      });

      const service = new CollectionService(repo);
      const result = await service.moveRequest({ sourceCollectionId: 'col-1', requestId: 'req-1', targetCollectionId: 'col-2' });

      expect(result.order).toBe(0);
      expect(saveAllFn).toHaveBeenCalledTimes(1);
    });

    it('inserts at targetOrder and re-normalises sequential order values', async () => {
      const req1 = makeRequest({ id: 'req-1', collectionId: 'col-1', order: 0 });
      const req2 = makeRequest({ id: 'req-2', collectionId: 'col-1', order: 1 });
      const srcReq = makeRequest({ id: 'req-src', collectionId: 'col-src' });

      const sourceCol = makeCollection({ id: 'col-src', requests: [srcReq] });
      const targetCol = makeCollection({ id: 'col-1', requests: [req1, req2] });

      const saveAllFn = vi.fn().mockResolvedValue(undefined);
      const repo = mockRepo({
        getAll: vi.fn().mockResolvedValue([sourceCol, targetCol]),
        saveAll: saveAllFn,
      });

      const service = new CollectionService(repo);
      const result = await service.moveRequest({
        sourceCollectionId: 'col-src',
        requestId: 'req-src',
        targetCollectionId: 'col-1',
        targetOrder: 0,
      });

      // Inserted at position 0; existing items shift to 1, 2
      expect(result.order).toBe(0);
      expect(req1.order).toBe(1);
      expect(req2.order).toBe(2);
      expect(saveAllFn).toHaveBeenCalledTimes(1);
    });

    it('correctly inserts when existing orders are non-sequential', async () => {
      const req1 = makeRequest({ id: 'req-1', collectionId: 'col-1', order: 0 });
      const req2 = makeRequest({ id: 'req-2', collectionId: 'col-1', order: 5 });
      const req3 = makeRequest({ id: 'req-3', collectionId: 'col-1', order: 10 });
      const srcReq = makeRequest({ id: 'req-src', collectionId: 'col-src' });

      const sourceCol = makeCollection({ id: 'col-src', requests: [srcReq] });
      const targetCol = makeCollection({ id: 'col-1', requests: [req1, req2, req3] });

      const saveAllFn = vi.fn().mockResolvedValue(undefined);
      const repo = mockRepo({
        getAll: vi.fn().mockResolvedValue([sourceCol, targetCol]),
        saveAll: saveAllFn,
      });

      const service = new CollectionService(repo);
      const result = await service.moveRequest({
        sourceCollectionId: 'col-src',
        requestId: 'req-src',
        targetCollectionId: 'col-1',
        targetOrder: 1, // insert between req1 and req2 (visual index 1)
      });

      // After normalisation: req1=0, srcReq=1, req2=2, req3=3
      expect(req1.order).toBe(0);
      expect(result.order).toBe(1);
      expect(req2.order).toBe(2);
      expect(req3.order).toBe(3);
    });

    it('same-slot reorder: dragging first item to second-to-last position places it correctly', async () => {
      // [A, B, C, D] — drag A to targetOrder=3 (between C and D, as seen in the full list).
      // After removal, the adjusted index should be 2, yielding [B, C, A, D].
      const reqA = makeRequest({ id: 'req-a', collectionId: 'col-1', order: 0 });
      const reqB = makeRequest({ id: 'req-b', collectionId: 'col-1', order: 1 });
      const reqC = makeRequest({ id: 'req-c', collectionId: 'col-1', order: 2 });
      const reqD = makeRequest({ id: 'req-d', collectionId: 'col-1', order: 3 });

      const col = makeCollection({ id: 'col-1', requests: [reqA, reqB, reqC, reqD] });

      const saveAllFn = vi.fn().mockResolvedValue(undefined);
      const repo = mockRepo({
        getAll: vi.fn().mockResolvedValue([col]),
        saveAll: saveAllFn,
      });

      const service = new CollectionService(repo);
      const result = await service.moveRequest({
        sourceCollectionId: 'col-1',
        requestId: 'req-a',
        targetCollectionId: 'col-1',
        targetOrder: 2, // @dnd-kit sends the desired final index: A ends up at 2 → [B, C, A, D]
      });

      // Expected order: [B=0, C=1, A=2, D=3]
      expect(reqB.order).toBe(0);
      expect(reqC.order).toBe(1);
      expect(result.order).toBe(2);
      expect(reqD.order).toBe(3);
    });
  });

  describe('moveFolder', () => {
    it('throws badRequest when moving folder into itself', async () => {
      const folder = { id: 'f-1', name: 'Folder 1', collectionId: 'col-1' } as Folder;
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
