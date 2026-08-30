import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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

function readOrder(dataDir: string): Record<string, string[]> {
  return JSON.parse(fs.readFileSync(path.join(dataDir, 'order.json'), 'utf-8'));
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

  it('returns empty array when no collections directory', async () => {
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

  it('writes each collection to its own slug-named file and registers it in order.json', async () => {
    const col = makeCollection({ name: 'My API' });
    await repo.create(col);

    const collectionFile = path.join(tmpDir, 'collections', 'my-api.json');
    expect(fs.existsSync(collectionFile)).toBe(true);
    expect(JSON.parse(fs.readFileSync(collectionFile, 'utf-8')).id).toBe(col.id);
    expect(readOrder(tmpDir).collections).toEqual([col.id]);
  });

  it('falls back to the id as file name when the name has no usable characters', async () => {
    const col = makeCollection({ name: '!!!' });
    await repo.create(col);

    expect(fs.existsSync(path.join(tmpDir, 'collections', `${col.id}.json`))).toBe(true);
  });

  it('suffixed file names keep same-named collections distinct', async () => {
    const col1 = makeCollection({ name: 'My API' });
    const col2 = makeCollection({ name: 'My API' });
    await repo.create(col1);
    await repo.create(col2);

    const dirFiles = fs.readdirSync(path.join(tmpDir, 'collections'));
    expect(dirFiles.sort()).toEqual(['my-api-2.json', 'my-api.json']);
    expect(await repo.getById(col2.id)).toBeDefined();
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

  it('renames the file when a collection is renamed', async () => {
    const col = makeCollection({ name: 'Original' });
    await repo.create(col);

    await repo.update(col.id, { name: 'Renamed' });

    const dirFiles = fs.readdirSync(path.join(tmpDir, 'collections'));
    expect(dirFiles).toEqual(['renamed.json']);
    expect(fs.existsSync(path.join(tmpDir, 'collections', 'original.json'))).toBe(false);

    const found = await repo.getById(col.id);
    expect(found?.name).toBe('Renamed');
    // Order manifest is keyed by id — unchanged by a rename
    expect(readOrder(tmpDir).collections).toEqual([col.id]);
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
    expect(readOrder(tmpDir).collections).toEqual([]);
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

  it('getAll orders collections by the order manifest', async () => {
    const col1 = makeCollection({ name: 'A' });
    const col2 = makeCollection({ name: 'B' });
    await repo.create(col1);
    await repo.create(col2);

    await repo.reorder([col2.id, col1.id]);

    const all = await repo.getAll();
    expect(all.map((c) => c.id)).toEqual([col2.id, col1.id]);
  });

  it('getAll appends collections missing from the order manifest', async () => {
    const col = makeCollection({ name: 'A' });
    await repo.create(col);

    // Simulate a file added by another tool, absent from the manifest
    const stray = makeCollection({ name: 'Stray' });
    fs.writeFileSync(
      path.join(tmpDir, 'collections', 'stray.json'),
      JSON.stringify(stray, null, 2),
    );

    const all = await repo.getAll();
    expect(all.map((c) => c.id)).toEqual([col.id, stray.id]);
  });

  it('saveAll writes all collections, removes missing ones and rewrites the order', async () => {
    const col1 = makeCollection({ name: 'A' });
    const col2 = makeCollection({ name: 'B' });
    const col3 = makeCollection({ name: 'C' });
    await repo.create(col1);
    await repo.create(col2);
    await repo.create(col3);

    await repo.saveAll([col3, col1]);

    const all = await repo.getAll();
    expect(all.map((c) => c.id)).toEqual([col3.id, col1.id]);
    expect(fs.existsSync(path.join(tmpDir, 'collections', 'b.json'))).toBe(false);
    expect(readOrder(tmpDir).collections).toEqual([col3.id, col1.id]);
  });
});
