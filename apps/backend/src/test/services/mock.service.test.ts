import { describe, it, expect, vi } from 'vitest';
import net from 'node:net';
import { MockService } from '../../services/mock.service';
import { MockEndpointRepository } from '../../repositories/mock-endpoint.repository';
import type { MockEndpoint } from '../../models/mock';

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, () => {
      const { port } = probe.address() as net.AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

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
    getAll: vi.fn().mockReturnValue([]),
    getById: vi.fn().mockReturnValue(undefined),
    create: vi.fn().mockImplementation((e: MockEndpoint) => e),
    update: vi.fn().mockReturnValue(null),
    delete: vi.fn().mockReturnValue(false),
    reorder: vi.fn(),
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
    it('throws notFound when endpoint does not exist', () => {
      const service = new MockService(mockRepo());
      expect(() => service.getById('missing')).toThrow(expect.objectContaining({ statusCode: 404 }));
    });

    it('returns the endpoint when found', () => {
      const endpoint = makeEndpoint();
      const service = new MockService(mockRepo({ getById: vi.fn().mockReturnValue(endpoint) }));
      expect(service.getById('mep-1')).toBe(endpoint);
    });
  });

  describe('create', () => {
    it('generates an mep- prefixed id', () => {
      const repo = mockRepo();
      const service = new MockService(repo);
      const created = service.create({
        name: 'Users',
        path: '/api/users',
        enabled: true,
        mode: 'static',
        methods: {},
      });

      expect(created.id).toMatch(/^mep-/);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Users' }));
    });

    it('keeps static responses on dynamic endpoints (switch-back support)', () => {
      const repo = mockRepo();
      const service = new MockService(repo);
      const staticResponse = { status: 200, headers: {}, contentType: 'json' as const, body: '[]', delayMs: 0 };
      service.create({
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
    it('throws notFound when the repository reports the endpoint missing', () => {
      const service = new MockService(mockRepo());
      expect(() => service.update('missing', { name: 'X' })).toThrow(expect.objectContaining({ statusCode: 404 }));
    });

    it('rejects updates that would leave a static endpoint with no methods', () => {
      const repo = mockRepo({
        getById: vi.fn().mockReturnValue(makeEndpoint()),
        update: vi.fn().mockReturnValue(makeEndpoint()),
      });
      const service = new MockService(repo);
      expect(() => service.update('mep-1', { methods: {} })).toThrow(expect.objectContaining({ statusCode: 400 }));
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects switching an endpoint to static mode without methods', () => {
      const repo = mockRepo({
        getById: vi.fn().mockReturnValue(makeEndpoint({ mode: 'dynamic', methods: {} })),
      });
      const service = new MockService(repo);
      expect(() => service.update('mep-1', { mode: 'static' })).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('allows clearing methods on a dynamic endpoint', () => {
      const dynamic = makeEndpoint({ mode: 'dynamic', methods: {} });
      const repo = mockRepo({
        getById: vi.fn().mockReturnValue(dynamic),
        update: vi.fn().mockReturnValue(dynamic),
      });
      const service = new MockService(repo);
      expect(service.update('mep-1', { methods: {} })).toBe(dynamic);
    });
  });

  describe('delete', () => {
    it('throws notFound when the endpoint does not exist', () => {
      const service = new MockService(mockRepo());
      expect(() => service.delete('missing')).toThrow(expect.objectContaining({ statusCode: 404 }));
    });
  });

  describe('reorder', () => {
    it('rejects ids that do not exist', () => {
      const service = new MockService(
        mockRepo({ getAll: vi.fn().mockReturnValue([makeEndpoint()]) }),
      );
      expect(() => service.reorder(['mep-1', 'mep-ghost'])).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('persists the new order', () => {
      const repo = mockRepo({ getAll: vi.fn().mockReturnValue([makeEndpoint()]) });
      const service = new MockService(repo);
      service.reorder(['mep-1']);
      expect(repo.reorder).toHaveBeenCalledWith(['mep-1']);
    });
  });

  describe('dataset', () => {
    it('reads the dataset through the repository', () => {
      const records = [{ id: '1' }];
      const service = new MockService(mockRepo({ readDataset: vi.fn().mockReturnValue(records) }));
      expect(service.getDataset('mep-1')).toBe(records);
    });

    it('updateDataset writes through the repository', () => {
      const repo = mockRepo({ getById: vi.fn().mockReturnValue(makeEndpoint()) });
      const service = new MockService(repo);
      service.updateDataset('mep-1', [{ id: '1' }]);
      expect(repo.writeDataset).toHaveBeenCalledWith('mep-1', [{ id: '1' }]);
    });

    it('updateDataset throws notFound for unknown endpoints', () => {
      const service = new MockService(mockRepo());
      expect(() => service.updateDataset('missing', [])).toThrow(expect.objectContaining({ statusCode: 404 }));
    });

    it('clearDataset deletes the persisted dataset', () => {
      const repo = mockRepo({ getById: vi.fn().mockReturnValue(makeEndpoint()) });
      const service = new MockService(repo);
      service.clearDataset('mep-1');
      expect(repo.deleteDataset).toHaveBeenCalledWith('mep-1');
      expect(repo.writeDataset).not.toHaveBeenCalled();
    });

    it('clearDataset throws notFound for unknown endpoints', () => {
      const service = new MockService(mockRepo());
      expect(() => service.clearDataset('missing')).toThrow(expect.objectContaining({ statusCode: 404 }));
    });
  });

  describe('duplicate', () => {
    it('creates a copy with a new id and " Copy" name', () => {
      const source = makeEndpoint();
      const repo = mockRepo({
        getById: vi.fn().mockReturnValue(source),
        create: vi.fn().mockImplementation((e: MockEndpoint) => e),
      });
      const service = new MockService(repo);

      const duplicate = service.duplicate('mep-1');

      expect(duplicate.id).not.toBe(source.id);
      expect(duplicate.name).toBe('Users API Copy');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ id: duplicate.id }));
    });

    it('throws notFound for unknown endpoints', () => {
      const service = new MockService(mockRepo());
      expect(() => service.duplicate('missing')).toThrow(expect.objectContaining({ statusCode: 404 }));
    });
  });

  describe('request log', () => {
    it('starts empty', () => {
      const service = new MockService(mockRepo());
      expect(service.getLogs()).toEqual([]);
    });
  });

  describe('autoStart', () => {
    it('starts the server even when no state was persisted', async () => {
      const port = await getFreePort();
      const service = new MockService(mockRepo({ readServerState: vi.fn().mockReturnValue({ running: false, port }) }));
      try {
        await service.autoStart();
        expect(service.getStatus()).toEqual({ running: true, port, url: `http://localhost:${port}` });
      } finally {
        await service.stop();
      }
    });

    it('stops the server on request', async () => {
      const port = await getFreePort();
      const service = new MockService(mockRepo());
      await service.start(port);
      await service.stop();
      expect(service.getStatus().running).toBe(false);
    });
  });
});
