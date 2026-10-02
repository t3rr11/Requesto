import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'os';
import { MockEndpointRepository } from '../../repositories/mock-endpoint.repository';
import type { MockEndpoint } from '../../models/mock';

function makeEndpoint(overrides: Partial<MockEndpoint> = {}): MockEndpoint {
  return {
    id: `mep-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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

function readOrder(dataDir: string): Record<string, string[]> {
  return JSON.parse(fs.readFileSync(path.join(dataDir, 'order.json'), 'utf-8'));
}

describe('MockEndpointRepository', () => {
  let tmpDir: string;
  let repo: MockEndpointRepository;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-test-'));
    fs.mkdirSync(path.join(tmpDir, 'local'), { recursive: true });
    repo = new MockEndpointRepository(() => tmpDir, () => path.join(tmpDir, 'local'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no endpoints directory exists', async () => {
    expect(await repo.getAll()).toEqual([]);
  });

  it('saves and retrieves an endpoint in its own slug-named file', async () => {
    const endpoint = makeEndpoint();
    await repo.create(endpoint);

    const all = await repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Users API');
    expect(fs.existsSync(path.join(tmpDir, 'mock-endpoints', 'users-api.json'))).toBe(true);
    expect(readOrder(tmpDir).mockEndpoints).toEqual([endpoint.id]);
  });

  it('renames the file when the endpoint name changes', async () => {
    const endpoint = makeEndpoint({ name: 'Old Name' });
    await repo.create(endpoint);

    await repo.update(endpoint.id, { name: 'New Name' });

    expect(fs.existsSync(path.join(tmpDir, 'mock-endpoints', 'old-name.json'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'mock-endpoints', 'new-name.json'))).toBe(true);
  });

  it('returns undefined for a missing id', async () => {
    expect(await repo.getById('missing')).toBeUndefined();
  });

  it('deletes an endpoint, its order entry and its dataset', async () => {
    const endpoint = makeEndpoint();
    await repo.create(endpoint);
    repo.writeDataset(endpoint.id, [{ id: '1' }]);

    const deleted = await repo.delete(endpoint.id);

    expect(deleted).toBe(true);
    expect(await repo.getAll()).toEqual([]);
    expect(readOrder(tmpDir).mockEndpoints).toEqual([]);
    expect(fs.existsSync(path.join(tmpDir, 'local', 'mock-data', `${endpoint.id}.json`))).toBe(false);
  });

  it('round-trips the dataset in the local sidecar directory', () => {
    const records = [{ id: '1', name: 'Alice' }];
    repo.writeDataset('mep-1', records);

    expect(fs.existsSync(path.join(tmpDir, 'local', 'mock-data', 'mep-1.json'))).toBe(true);
    expect(repo.readDataset('mep-1')).toEqual(records);
  });

  it('returns an empty dataset when none was written', () => {
    expect(repo.readDataset('mep-missing')).toEqual([]);
  });

  it('round-trips the mock server state', () => {
    expect(repo.readServerState()).toEqual({ running: false, port: 0 });

    repo.writeServerState({ running: true, port: 4748 });
    expect(repo.readServerState()).toEqual({ running: true, port: 4748 });

    repo.writeServerState({ running: false, port: 0 });
    expect(repo.readServerState()).toEqual({ running: false, port: 0 });
  });

  it('honours the order manifest when listing endpoints', async () => {
    const first = makeEndpoint({ name: 'First' });
    const second = makeEndpoint({ name: 'Second' });
    await repo.create(first);
    await repo.create(second);
    await repo.reorder([second.id, first.id]);

    const all = await repo.getAll();
    expect(all.map((e) => e.id)).toEqual([second.id, first.id]);
  });
});
