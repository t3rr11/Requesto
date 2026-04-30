import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CollectionRepository } from '../../repositories/collection.repository';
import type { Collection, SavedRequest } from '../../models/collection';

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: `col-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: 'Test Collection',
    folders: [],
    requests: [],
    ...overrides,
  };
}

function makeRequest(collectionId: string, overrides: Partial<SavedRequest> = {}): SavedRequest {
  return {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: 'Test Request',
    method: 'GET',
    url: 'http://example.com',
    collectionId,
    ...overrides,
  };
}

describe('CollectionRepository', () => {
  let tmpDir: string;
  let repo: CollectionRepository;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-col-test-'));
    repo = new CollectionRepository(() => tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no collections file', async () => {
    const all = await repo.getAll();
    expect(all).toEqual([]);
  });

  it('creates and retrieves a collection', async () => {
    const col = makeCollection({ name: 'My API' });
    const created = await repo.create(col);
    expect(created.name).toBe('My API');

    const found = await repo.getById(col.id);
    expect(found?.name).toBe('My API');
  });

  it('getById returns undefined for unknown id', async () => {
    expect(await repo.getById('nonexistent')).toBeUndefined();
  });

  it('updates a collection', async () => {
    const col = makeCollection({ name: 'Original' });
    await repo.create(col);

    const updated = await repo.update(col.id, { name: 'Updated' });
    expect(updated?.name).toBe('Updated');

    const found = await repo.getById(col.id);
    expect(found?.name).toBe('Updated');
  });

  it('update returns null for unknown id', async () => {
    expect(await repo.update('nonexistent', { name: 'x' })).toBeNull();
  });

  it('deletes a collection', async () => {
    const col = makeCollection();
    await repo.create(col);

    const deleted = await repo.delete(col.id);
    expect(deleted).toBe(true);
    expect(await repo.getById(col.id)).toBeUndefined();
  });

  it('delete returns false for unknown id', async () => {
    expect(await repo.delete('nonexistent')).toBe(false);
  });

  it('adds a request to a collection', async () => {
    const col = makeCollection();
    await repo.create(col);

    const req = makeRequest(col.id, { name: 'Get Users' });
    const saved = await repo.addRequest(col.id, req);
    expect(saved?.name).toBe('Get Users');

    const found = await repo.getById(col.id);
    expect(found?.requests).toHaveLength(1);
    expect(found?.requests[0].name).toBe('Get Users');
  });

  it('updates a request', async () => {
    const col = makeCollection();
    await repo.create(col);
    const req = makeRequest(col.id);
    await repo.addRequest(col.id, req);

    const updated = await repo.updateRequest(col.id, req.id, { name: 'Updated Request' });
    expect(updated?.name).toBe('Updated Request');
  });

  it('deletes a request', async () => {
    const col = makeCollection();
    await repo.create(col);
    const req = makeRequest(col.id);
    await repo.addRequest(col.id, req);

    const deleted = await repo.deleteRequest(col.id, req.id);
    expect(deleted).toBe(true);

    const found = await repo.getById(col.id);
    expect(found?.requests).toHaveLength(0);
  });

  it('getAll returns multiple collections', async () => {
    const col1 = makeCollection({ name: 'A' });
    const col2 = makeCollection({ name: 'B' });
    await repo.create(col1);
    await repo.create(col2);

    const all = await repo.getAll();
    expect(all).toHaveLength(2);
  });
});
