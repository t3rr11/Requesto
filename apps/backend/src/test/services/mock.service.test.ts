import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'os';
import { MockService } from '../../services/mock.service';
import { MockEndpointRepository } from '../../repositories/mock-endpoint.repository';
import type { MockEndpoint } from '../../models/mock';

function makeEndpoint(overrides: Partial<MockEndpoint> = {}): MockEndpoint {
  return {
    id: 'mep-1',
    name: 'Users API',
    path: '/api/users',
    enabled: true,
    mode: 'static',
    methods: {
      GET: {
        status: 200,
        headers: {},
        contentType: 'json',
        body: '[]',
        delayMs: 0,
      },
    },
    ...overrides,
  };
}

function mockRepo(overrides: Partial<MockEndpointRepository> = {}): MockEndpointRepository {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockImplementation(async (e: MockEndpoint) => e),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(false),
    reorder: vi.fn().mockResolvedValue(undefined),
    readDataset: vi.fn().mockReturnValue([]),
    writeDataset: vi.fn(),
    deleteDataset: vi.fn(),
    readServerState: vi.fn().mockReturnValue({ running: false, port: 0 }),
    writeServerState: vi.fn(),
    ...overrides,
  } as unknown as MockEndpointRepository;
}

describe('MockService', () => {
  describe('getById', () => {
    it('throws notFound when endpoint does not exist', async () => {
      const service = new MockService(mockRepo());
      await expect(service.getById('missing')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('returns the endpoint when found', async () => {
      const endpoint = makeEndpoint();
      const service = new MockService(mockRepo({ getById: vi.fn().mockResolvedValue(endpoint) }));
      expect(await service.getById('mep-1')).toBe(endpoint);
    });
  });

  describe('create', () => {
    it('generates an mep- prefixed id', async () => {
      const repo = mockRepo();
      const service = new MockService(repo);
      const created = await service.create({
        name: 'Users',
        path: '/api/users',
        enabled: true,
        mode: 'static',
        methods: {},
      });

      expect(created.id).toMatch(/^mep-/);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Users' }));
    });

    it('keeps static responses on dynamic endpoints (switch-back support)', async () => {
      const repo = mockRepo();
      const service = new MockService(repo);
      const staticResponse = { status: 200, headers: {}, contentType: 'json' as const, body: '[]', delayMs: 0 };
      await service.create({
        name: 'Users',
        path: '/api/users',
        enabled: true,
        mode: 'dynamic',
        methods: { GET: staticResponse },
      });

      const created = (repo.create as ReturnType<typeof vi.fn>).mock.calls[0][0] as MockEndpoint;
      expect(created.mode).toBe('dynamic');
      expect(created.methods.GET).toEqual(staticResponse);
    });
  });

  describe('update', () => {
    it('throws notFound when the repository reports the endpoint missing', async () => {
      const service = new MockService(mockRepo());
      await expect(service.update('missing', { name: 'X' })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects updates that would leave a static endpoint with no methods', async () => {
      const repo = mockRepo({
        getById: vi.fn().mockResolvedValue(makeEndpoint()),
        update: vi.fn().mockResolvedValue(makeEndpoint()),
      });
      const service = new MockService(repo);
      await expect(service.update('mep-1', { methods: {} })).rejects.toMatchObject({ statusCode: 400 });
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects switching an endpoint to static mode without methods', async () => {
      const repo = mockRepo({
        getById: vi.fn().mockResolvedValue(makeEndpoint({ mode: 'dynamic', methods: {} })),
      });
      const service = new MockService(repo);
      await expect(service.update('mep-1', { mode: 'static' })).rejects.toMatchObject({ statusCode: 400 });
    });

    it('allows clearing methods on a dynamic endpoint', async () => {
      const dynamic = makeEndpoint({ mode: 'dynamic', methods: {} });
      const repo = mockRepo({
        getById: vi.fn().mockResolvedValue(dynamic),
        update: vi.fn().mockResolvedValue(dynamic),
      });
      const service = new MockService(repo);
      await expect(service.update('mep-1', { methods: {} })).resolves.toBe(dynamic);
    });
  });

  describe('delete', () => {
    it('throws notFound when the endpoint does not exist', async () => {
      const service = new MockService(mockRepo());
      await expect(service.delete('missing')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('reorder', () => {
    it('rejects ids that do not exist', async () => {
      const service = new MockService(
        mockRepo({ getAll: vi.fn().mockResolvedValue([makeEndpoint()]) }),
      );
      await expect(service.reorder(['mep-1', 'mep-ghost'])).rejects.toMatchObject({ statusCode: 400 });
    });

    it('persists the new order', async () => {
      const repo = mockRepo({ getAll: vi.fn().mockResolvedValue([makeEndpoint()]) });
      const service = new MockService(repo);
      await service.reorder(['mep-1']);
      expect(repo.reorder).toHaveBeenCalledWith(['mep-1']);
    });
  });

  describe('dataset', () => {
    it('reads the dataset through the repository', () => {
      const records = [{ id: '1' }];
      const service = new MockService(mockRepo({ readDataset: vi.fn().mockReturnValue(records) }));
      expect(service.getDataset('mep-1')).toBe(records);
    });

    it('updateDataset writes through the repository', async () => {
      const repo = mockRepo({ getById: vi.fn().mockResolvedValue(makeEndpoint()) });
      const service = new MockService(repo);
      await service.updateDataset('mep-1', [{ id: '1' }]);
      expect(repo.writeDataset).toHaveBeenCalledWith('mep-1', [{ id: '1' }]);
    });

    it('updateDataset throws notFound for unknown endpoints', async () => {
      const service = new MockService(mockRepo());
      await expect(service.updateDataset('missing', [])).rejects.toMatchObject({ statusCode: 404 });
    });

    it('clearDataset deletes the persisted dataset', async () => {
      const repo = mockRepo({ getById: vi.fn().mockResolvedValue(makeEndpoint()) });
      const service = new MockService(repo);
      await service.clearDataset('mep-1');
      expect(repo.deleteDataset).toHaveBeenCalledWith('mep-1');
      expect(repo.writeDataset).not.toHaveBeenCalled();
    });

    it('clearDataset throws notFound for unknown endpoints', async () => {
      const service = new MockService(mockRepo());
      await expect(service.clearDataset('missing')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('duplicate', () => {
    it('creates a copy with a new id and " Copy" name', async () => {
      const source = makeEndpoint();
      const repo = mockRepo({
        getById: vi.fn().mockResolvedValue(source),
        create: vi.fn().mockImplementation(async (e: MockEndpoint) => e),
      });
      const service = new MockService(repo);

      const duplicate = await service.duplicate('mep-1');

      expect(duplicate.id).not.toBe(source.id);
      expect(duplicate.name).toBe('Users API Copy');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ id: duplicate.id }));
    });

    it('throws notFound for unknown endpoints', async () => {
      const service = new MockService(mockRepo());
      await expect(service.duplicate('missing')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('request log', () => {
    it('starts empty', () => {
      const service = new MockService(mockRepo());
      expect(service.getLogs()).toEqual([]);
    });
  });

  describe('autoStart', () => {
    it('does not start when the persisted state says not running', async () => {
      const service = new MockService(mockRepo({ readServerState: vi.fn().mockReturnValue({ running: false, port: 0 }) }));
      await service.autoStart();
      expect((await service.getStatus()).running).toBe(false);
    });
  });
});

describe('MockEndpointRepository server state integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-test-'));
    fs.mkdirSync(path.join(tmpDir, 'local'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
