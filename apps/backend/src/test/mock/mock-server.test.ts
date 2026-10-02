import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'os';
import { buildMockApp } from '../../mock/mock-app';
import { MockEndpointRepository } from '../../repositories/mock-endpoint.repository';
import type { MockEndpoint } from '../../models/mock';

function makeEndpoint(overrides: Partial<MockEndpoint> = {}): MockEndpoint {
  return {
    id: 'mep-users',
    name: 'Users',
    path: '/api/users',
    enabled: true,
    mode: 'static',
    methods: {
      GET: {
        status: 200,
        headers: {},
        contentType: 'json',
        body: '[{"name":"Alice"}]',
        delayMs: 0,
      },
    },
    ...overrides,
  };
}

describe('mock server', () => {
  let tmpDir: string;
  let repo: MockEndpointRepository;
  let hits: Array<{ method: string; path: string; status: number }>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-mock-'));
    fs.mkdirSync(path.join(tmpDir, 'local'), { recursive: true });
    repo = new MockEndpointRepository(() => tmpDir, () => path.join(tmpDir, 'local'));
    hits = [];
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function buildApp() {
    return buildMockApp({
      endpointRepository: repo,
      onHit: (hit) => hits.push({ method: hit.method, path: hit.path, status: hit.status }),
    });
  }

  describe('static responses', () => {
    it('serves the configured status, content type and body', async () => {
      const endpoint = makeEndpoint();
      await repo.create(endpoint);
      const app = await buildApp();

      const response = await app.inject({ method: 'GET', url: '/api/users' });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toBe('[{"name":"Alice"}]');
      expect(hits).toEqual([
        { method: 'GET', path: '/api/users', status: 200 },
      ]);
    });

    it('serves text/html content type', async () => {
      await repo.create(makeEndpoint({
        methods: {
          GET: { status: 200, headers: {}, contentType: 'html', body: '<h1>Hi</h1>', delayMs: 0 },
        },
      }));
      const app = await buildApp();

      const response = await app.inject({ method: 'GET', url: '/api/users' });

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toBe('<h1>Hi</h1>');
    });

    it('serves custom headers', async () => {
      await repo.create(makeEndpoint({
        methods: {
          GET: {
            status: 201,
            headers: { 'X-Custom': 'yes', 'Location': '/api/users/1' },
            contentType: 'json',
            body: '{}',
            delayMs: 0,
          },
        },
      }));
      const app = await buildApp();

      const response = await app.inject({ method: 'GET', url: '/api/users' });

      expect(response.statusCode).toBe(201);
      expect(response.headers['x-custom']).toBe('yes');
      expect(response.headers['location']).toBe('/api/users/1');
    });

    it('honours the configured delay', async () => {
      await repo.create(makeEndpoint({
        methods: {
          GET: { status: 200, headers: {}, contentType: 'text', body: 'ok', delayMs: 30 },
        },
      }));
      const app = await buildApp();

      const start = Date.now();
      await app.inject({ method: 'GET', url: '/api/users' });
      expect(Date.now() - start).toBeGreaterThanOrEqual(30);
    });

    it('substitutes template variables in the body', async () => {
      await repo.create(makeEndpoint({
        methods: {
          GET: {
            status: 200,
            headers: {},
            contentType: 'text',
            body: 'uuid={{uuid}} ts={{timestamp}} rand={{randomInt 5 5}} keep={{unknown}}',
            delayMs: 0,
          },
        },
      }));
      const app = await buildApp();

      const response = await app.inject({ method: 'GET', url: '/api/users' });

      expect(response.body).toMatch(/^uuid=[0-9a-f-]{36} ts=\d+ rand=5 keep=\{\{unknown\}\}$/);
    });
  });

  describe('path matching', () => {
    it('matches path parameters and exposes them to dynamic handlers', async () => {
      await repo.create(makeEndpoint({ path: '/api/users/:id', mode: 'dynamic', methods: {} }));
      const app = await buildApp();

      const response = await app.inject({ method: 'GET', url: '/api/users/42' });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: 'Record not found' });
    });

    it('prefers static segments over parameters when both match', async () => {
      await repo.create(makeEndpoint({ path: '/api/users/:id', id: 'mep-param', mode: 'dynamic', methods: {} }));
      await repo.create(makeEndpoint({ path: '/api/users/me', id: 'mep-me' }));
      const app = await buildApp();

      const response = await app.inject({ method: 'GET', url: '/api/users/me' });

      expect(response.body).toBe('[{"name":"Alice"}]');
    });

    it('returns 404 for unmatched paths', async () => {
      await repo.create(makeEndpoint());
      const app = await buildApp();

      const response = await app.inject({ method: 'GET', url: '/nope' });

      expect(response.statusCode).toBe(404);
    });

    it('ignores disabled endpoints', async () => {
      await repo.create(makeEndpoint({ enabled: false }));
      const app = await buildApp();

      const response = await app.inject({ method: 'GET', url: '/api/users' });

      expect(response.statusCode).toBe(404);
      expect(hits[0].status).toBe(404);
    });

    it('returns 405 with an Allow header for unconfigured methods', async () => {
      await repo.create(makeEndpoint());
      const app = await buildApp();

      const response = await app.inject({ method: 'DELETE', url: '/api/users' });

      expect(response.statusCode).toBe(405);
      expect(response.headers['allow']).toBe('GET');
    });
  });

  describe('dynamic mode', () => {
    function dynamicEndpoint(overrides: Partial<MockEndpoint> = {}): MockEndpoint {
      return makeEndpoint({
        path: '/api/users',
        mode: 'dynamic',
        methods: {},
        ...overrides,
      });
    }

    it('runs the full CRUD lifecycle with persistence', async () => {
      await repo.create(dynamicEndpoint());
      const app = await buildApp();

      const created = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: { name: 'Alice', role: 'admin' },
      });
      expect(created.statusCode).toBe(201);
      const record = created.json();
      expect(record.name).toBe('Alice');
      expect(typeof record.id).toBe('string');

      const listed = await app.inject({ method: 'GET', url: '/api/users' });
      expect(listed.json()).toEqual([record]);

      const fetched = await app.inject({ method: 'GET', url: `/api/users/${record.id}` });
      expect(fetched.json().name).toBe('Alice');

      const replaced = await app.inject({
        method: 'PUT',
        url: `/api/users/${record.id}`,
        payload: { name: 'Alicia' },
      });
      expect(replaced.json()).toEqual({ name: 'Alicia', id: record.id });

      const patched = await app.inject({
        method: 'PATCH',
        url: `/api/users/${record.id}`,
        payload: { role: 'user' },
      });
      expect(patched.json()).toEqual({ name: 'Alicia', role: 'user', id: record.id });

      expect(repo.readDataset('mep-users')).toEqual([{ name: 'Alicia', role: 'user', id: record.id }]);

      const removed = await app.inject({ method: 'DELETE', url: `/api/users/${record.id}` });
      expect(removed.statusCode).toBe(200);
      expect(repo.readDataset('mep-users')).toEqual([]);
    });

    it('filters GET lists by query parameters', async () => {
      await repo.create(dynamicEndpoint());
      repo.writeDataset('mep-users', [
        { id: '1', role: 'admin' },
        { id: '2', role: 'user' },
      ]);
      const app = await buildApp();

      const response = await app.inject({ method: 'GET', url: '/api/users?role=admin' });

      expect(response.json()).toEqual([{ id: '1', role: 'admin' }]);
    });

    it('rejects invalid POST bodies with 400', async () => {
      await repo.create(dynamicEndpoint());
      const app = await buildApp();

      const empty = await app.inject({ method: 'POST', url: '/api/users', payload: undefined });
      expect(empty.statusCode).toBe(400);

      const array = await app.inject({ method: 'POST', url: '/api/users', payload: [1, 2] });
      expect(array.statusCode).toBe(400);
    });

    it('keeps the id on replaced records and returns 404 for unknown ids', async () => {
      await repo.create(dynamicEndpoint());
      const app = await buildApp();

      const missing = await app.inject({
        method: 'PUT',
        url: '/api/users/ghost',
        payload: { name: 'X' },
      });
      expect(missing.statusCode).toBe(404);
    });

    it('keeps records created with a client-provided id', async () => {
      await repo.create(dynamicEndpoint());
      const app = await buildApp();

      const created = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: { id: 'custom-1', name: 'Bob' },
      });

      expect(created.json().id).toBe('custom-1');
    });

    it('serves both the collection route and the implicit :id route from one definition', async () => {
      await repo.create(dynamicEndpoint());
      repo.writeDataset('mep-users', [{ id: '1', name: 'Alice' }]);
      const app = await buildApp();

      const list = await app.inject({ method: 'GET', url: '/api/users' });
      expect(list.json()).toEqual([{ id: '1', name: 'Alice' }]);

      const item = await app.inject({ method: 'GET', url: '/api/users/1' });
      expect(item.json()).toEqual({ id: '1', name: 'Alice' });
    });

    it('does not serve implicit :id routes for static endpoints', async () => {
      await repo.create(makeEndpoint());
      const app = await buildApp();

      const response = await app.inject({ method: 'GET', url: '/api/users/5' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('CORS', () => {
    it('handles preflight from any origin', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/users',
        headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'GET' },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('dataset clearing', () => {
    it('serves persisted records and starts empty once the dataset is removed', async () => {
      await repo.create(makeEndpoint({ mode: 'dynamic', methods: {} }));
      repo.writeDataset('mep-users', [{ id: '1', name: 'Alice' }]);
      const app = await buildApp();

      const before = await app.inject({ method: 'GET', url: '/api/users' });
      expect(before.json()).toEqual([{ id: '1', name: 'Alice' }]);

      repo.deleteDataset('mep-users');
      const after = await app.inject({ method: 'GET', url: '/api/users' });
      expect(after.json()).toEqual([]);
    });
  });

  describe('legacy endpoint migration', () => {
    function writeLegacyFile(payload: Record<string, unknown>): void {
      const dir = path.join(tmpDir, 'mock-endpoints');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify(payload));
    }

    it('lifts per-method static configs and drops unknown fields', async () => {
      // Raw legacy file shape: per-method { mode, static } configs
      writeLegacyFile({
        id: 'mep-users',
        name: 'Users',
        path: '/api/users',
        enabled: true,
        methods: {
          GET: { mode: 'static', static: { status: 200, headers: {}, contentType: 'json', body: '[]', delayMs: 0 } },
        },
        seedData: [{ id: 's1', name: 'Seeded' }],
      });

      const endpoints = await repo.getAll();

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].mode).toBe('static');
      expect(endpoints[0].methods.GET).toEqual({ status: 200, headers: {}, contentType: 'json', body: '[]', delayMs: 0 });
      expect('seedData' in endpoints[0]).toBe(false);
    });

    it('converts endpoints with any dynamic method to endpoint-level dynamic mode', async () => {
      writeLegacyFile({
        id: 'mep-users',
        name: 'Users',
        path: '/api/users',
        enabled: true,
        methods: {
          GET: { mode: 'static', static: { status: 200, headers: {}, contentType: 'json', body: '[]', delayMs: 0 } },
          POST: { mode: 'dynamic' },
        },
      });

      const endpoints = await repo.getAll();

      expect(endpoints[0].mode).toBe('dynamic');
      expect(endpoints[0].methods).toEqual({});
    });
  });

  describe('hits log', () => {
    it('reports unmatched requests with the unmatched endpoint name', async () => {
      const app = await buildApp();

      await app.inject({ method: 'GET', url: '/nowhere' });

      expect(hits).toEqual([
        { method: 'GET', path: '/nowhere', status: 404 },
      ]);
    });
  });
});
