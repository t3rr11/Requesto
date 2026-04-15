import { describe, it, expect } from 'vitest';
import type { Collection, SavedRequest, Folder } from '../../../types';
import {
  buildSyncPreview,
  applySyncToCollection,
  urlMatchesTemplate,
} from '../../../helpers/openApi/reconcile';

function makeRequest(overrides: Partial<SavedRequest> & { id: string; operationId: string }): SavedRequest {
  return {
    name: overrides.operationId,
    method: 'GET',
    url: '{{baseUrl}}/test',
    collectionId: 'col-1',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeCollection(requests: SavedRequest[], folders: Folder[] = [], overrides?: Partial<Collection>): Collection {
  return {
    id: 'col-1',
    name: 'Test Collection',
    folders,
    requests,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

// ─── urlMatchesTemplate ───────────────────────────────────────────

describe('urlMatchesTemplate', () => {
  it('returns true for identical URLs', () => {
    expect(urlMatchesTemplate('{{baseUrl}}/pets', '{{baseUrl}}/pets')).toBe(true);
  });

  it('matches when user replaces single path param', () => {
    expect(urlMatchesTemplate('{{baseUrl}}/pets/123', '{{baseUrl}}/pets/{{petId}}')).toBe(true);
  });

  it('matches when user replaces baseUrl with full URL', () => {
    expect(urlMatchesTemplate('http://localhost:4000/pets', '{{baseUrl}}/pets')).toBe(true);
  });

  it('matches when user replaces both baseUrl and path param', () => {
    expect(urlMatchesTemplate(
      'http://localhost:4000/pets/123',
      '{{baseUrl}}/pets/{{petId}}',
    )).toBe(true);
  });

  it('matches with multiple path params', () => {
    expect(urlMatchesTemplate(
      'http://localhost:4000/owners/42/pets/7',
      '{{baseUrl}}/owners/{{ownerId}}/pets/{{petId}}',
    )).toBe(true);
  });

  it('matches with query string and placeholders', () => {
    expect(urlMatchesTemplate(
      'http://localhost:4000/pets?limit=10&offset=20',
      '{{baseUrl}}/pets?limit=0&offset=0',
    )).toBe(false); // query params are literal — different values are a diff
  });

  it('detects structural change in path', () => {
    expect(urlMatchesTemplate(
      '{{baseUrl}}/pets/123',
      '{{baseUrl}}/animals/{{petId}}',
    )).toBe(false);
  });

  it('detects structural change: extra segment', () => {
    expect(urlMatchesTemplate(
      '{{baseUrl}}/pets/123/details',
      '{{baseUrl}}/pets/{{petId}}',
    )).toBe(false);
  });

  it('detects when no placeholders exist and URLs differ', () => {
    expect(urlMatchesTemplate('/api/v1/pets', '/api/v2/pets')).toBe(false);
  });

  it('handles URL with protocol and port in baseUrl substitution', () => {
    expect(urlMatchesTemplate(
      'https://api.example.com:8443/v1/pets/42',
      '{{baseUrl}}/pets/{{petId}}',
    )).toBe(true);
  });

  it('handles empty placeholder replacement (should not match)', () => {
    // .+ requires at least one char, so empty substitution fails
    expect(urlMatchesTemplate('/pets', '{{baseUrl}}/pets')).toBe(false);
  });

  it('returns true when URLs are identical with no placeholders', () => {
    expect(urlMatchesTemplate('/api/v1/pets', '/api/v1/pets')).toBe(true);
  });
});

// ─── buildSyncPreview ─────────────────────────────────────────────

describe('buildSyncPreview', () => {
  it('detects new operations', () => {
    const existing = makeCollection([
      makeRequest({ id: 'r1', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
    ]);
    const incoming = makeCollection([
      makeRequest({ id: 'r1-new', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
      makeRequest({ id: 'r2-new', operationId: 'createPet', method: 'POST', url: '{{baseUrl}}/pets' }),
    ]);

    const preview = buildSyncPreview(existing, incoming, 'hash-2');

    expect(preview.added).toHaveLength(1);
    expect(preview.added[0].operationId).toBe('createPet');
    expect(preview.unchangedCount).toBe(1);
  });

  it('detects orphaned operations', () => {
    const existing = makeCollection([
      makeRequest({ id: 'r1', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
      makeRequest({ id: 'r2', operationId: 'deletePet', url: '{{baseUrl}}/pets/{{petId}}' }),
    ]);
    const incoming = makeCollection([
      makeRequest({ id: 'r1-new', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
    ]);

    const preview = buildSyncPreview(existing, incoming, 'hash-2');

    expect(preview.orphaned).toHaveLength(1);
    expect(preview.orphaned[0].operationId).toBe('deletePet');
    expect(preview.orphaned[0].requestId).toBe('r2');
  });

  it('detects method changes as updates', () => {
    const existing = makeCollection([
      makeRequest({ id: 'r1', operationId: 'updatePet', method: 'PUT', url: '{{baseUrl}}/pets/{{petId}}' }),
    ]);
    const incoming = makeCollection([
      makeRequest({ id: 'r1-new', operationId: 'updatePet', method: 'PATCH', url: '{{baseUrl}}/pets/{{petId}}' }),
    ]);

    const preview = buildSyncPreview(existing, incoming, 'hash-2');

    expect(preview.updated).toHaveLength(1);
    expect(preview.updated[0].changes).toEqual([
      { field: 'method', from: 'PUT', to: 'PATCH' },
    ]);
  });

  it('detects URL structural changes as updates', () => {
    const existing = makeCollection([
      makeRequest({ id: 'r1', operationId: 'getPet', url: '{{baseUrl}}/pet/{{petId}}' }),
    ]);
    const incoming = makeCollection([
      makeRequest({ id: 'r1-new', operationId: 'getPet', url: '{{baseUrl}}/pets/{{petId}}' }),
    ]);

    const preview = buildSyncPreview(existing, incoming, 'hash-2');

    expect(preview.updated).toHaveLength(1);
    expect(preview.updated[0].changes[0].field).toBe('url');
  });

  it('preserves user URL when only placeholders were substituted', () => {
    const existing = makeCollection([
      makeRequest({ id: 'r1', operationId: 'getPet', url: 'http://localhost:4000/pets/123' }),
    ]);
    const incoming = makeCollection([
      makeRequest({ id: 'r1-new', operationId: 'getPet', url: '{{baseUrl}}/pets/{{petId}}' }),
    ]);

    const preview = buildSyncPreview(existing, incoming, 'hash-2');

    // Should not be detected as a change
    expect(preview.updated).toHaveLength(0);
    expect(preview.unchangedCount).toBe(1);
  });

  it('preserves user values in merged request', () => {
    const existing = makeCollection([
      makeRequest({
        id: 'r1',
        operationId: 'getPet',
        method: 'GET',
        url: '{{baseUrl}}/pet/{{petId}}',
        name: 'My Custom Name',
        headers: { 'Authorization': 'Bearer my-token' },
        body: '{"custom": true}',
        auth: { type: 'bearer', bearer: { token: 'my-token' } },
      }),
    ]);
    const incoming = makeCollection([
      makeRequest({
        id: 'r1-new',
        operationId: 'getPet',
        method: 'GET',
        url: '{{baseUrl}}/pets/{{petId}}',
        name: 'Get a pet by ID',
        headers: { 'Accept': 'application/json' },
      }),
    ]);

    const preview = buildSyncPreview(existing, incoming, 'hash-2');

    expect(preview.updated).toHaveLength(1);
    const merged = preview.updated[0].mergedRequest;
    // Structural field updated
    expect(merged.url).toBe('{{baseUrl}}/pets/{{petId}}');
    // User-owned fields preserved
    expect(merged.name).toBe('My Custom Name');
    expect(merged.headers).toEqual({ 'Authorization': 'Bearer my-token' });
    expect(merged.body).toBe('{"custom": true}');
    expect(merged.auth).toEqual({ type: 'bearer', bearer: { token: 'my-token' } });
  });

  it('detects new folders from incoming spec', () => {
    const existing = makeCollection([], [
      { id: 'f1', name: 'pets', collectionId: 'col-1', createdAt: 1000, updatedAt: 1000 },
    ]);
    const incoming = makeCollection([], [
      { id: 'f1-new', name: 'pets', collectionId: 'col-1', createdAt: 2000, updatedAt: 2000 },
      { id: 'f2-new', name: 'users', collectionId: 'col-1', createdAt: 2000, updatedAt: 2000 },
    ]);

    const preview = buildSyncPreview(existing, incoming, 'hash-2');

    expect(preview.newFolders).toHaveLength(1);
    expect(preview.newFolders[0].name).toBe('users');
  });

  it('ignores requests without operationId', () => {
    const existing = makeCollection([
      makeRequest({ id: 'r1', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
      { id: 'r-custom', name: 'Custom', method: 'GET', url: '/custom', collectionId: 'col-1', createdAt: 1000, updatedAt: 1000 } as SavedRequest,
    ]);
    const incoming = makeCollection([
      makeRequest({ id: 'r1-new', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
    ]);

    const preview = buildSyncPreview(existing, incoming, 'hash-2');

    // Custom request without operationId should not show as orphaned
    expect(preview.orphaned).toHaveLength(0);
    expect(preview.unchangedCount).toBe(1);
  });
});

// ─── applySyncToCollection ────────────────────────────────────────

describe('applySyncToCollection', () => {
  it('adds selected new requests', () => {
    const collection = makeCollection([
      makeRequest({ id: 'r1', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
    ]);
    const preview = buildSyncPreview(
      collection,
      makeCollection([
        makeRequest({ id: 'r1-new', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
        makeRequest({ id: 'r2-new', operationId: 'createPet', method: 'POST', url: '{{baseUrl}}/pets' }),
      ]),
      'hash-2',
    );

    const result = applySyncToCollection(collection, preview, {
      addedOperationIds: ['createPet'],
      updatedRequestIds: [],
      removeRequestIds: [],
    });

    expect(result.requests).toHaveLength(2);
    expect(result.requests[1].operationId).toBe('createPet');
  });

  it('does not add unselected new requests', () => {
    const collection = makeCollection([
      makeRequest({ id: 'r1', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
    ]);
    const preview = buildSyncPreview(
      collection,
      makeCollection([
        makeRequest({ id: 'r1-new', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
        makeRequest({ id: 'r2-new', operationId: 'createPet', method: 'POST', url: '{{baseUrl}}/pets' }),
      ]),
      'hash-2',
    );

    const result = applySyncToCollection(collection, preview, {
      addedOperationIds: [],
      updatedRequestIds: [],
      removeRequestIds: [],
    });

    expect(result.requests).toHaveLength(1);
  });

  it('applies selected updates', () => {
    const collection = makeCollection([
      makeRequest({ id: 'r1', operationId: 'updatePet', method: 'PUT', url: '{{baseUrl}}/pets/{{petId}}' }),
    ]);
    const preview = buildSyncPreview(
      collection,
      makeCollection([
        makeRequest({ id: 'r1-new', operationId: 'updatePet', method: 'PATCH', url: '{{baseUrl}}/pets/{{petId}}' }),
      ]),
      'hash-2',
    );

    const result = applySyncToCollection(collection, preview, {
      addedOperationIds: [],
      updatedRequestIds: ['r1'],
      removeRequestIds: [],
    });

    expect(result.requests[0].method).toBe('PATCH');
  });

  it('removes selected orphaned requests', () => {
    const collection = makeCollection([
      makeRequest({ id: 'r1', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
      makeRequest({ id: 'r2', operationId: 'deletePet', url: '{{baseUrl}}/pets/{{petId}}' }),
    ]);
    const preview = buildSyncPreview(
      collection,
      makeCollection([
        makeRequest({ id: 'r1-new', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
      ]),
      'hash-2',
    );

    const result = applySyncToCollection(
      { ...collection, openApiSpec: { source: 'test', lastSyncedAt: 1000 } },
      preview,
      {
        addedOperationIds: [],
        updatedRequestIds: [],
        removeRequestIds: ['r2'],
      },
    );

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].operationId).toBe('listPets');
  });

  it('keeps unselected orphaned requests', () => {
    const collection = makeCollection([
      makeRequest({ id: 'r1', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
      makeRequest({ id: 'r2', operationId: 'deletePet', url: '{{baseUrl}}/pets/{{petId}}' }),
    ]);
    const preview = buildSyncPreview(
      collection,
      makeCollection([
        makeRequest({ id: 'r1-new', operationId: 'listPets', url: '{{baseUrl}}/pets' }),
      ]),
      'hash-2',
    );

    const result = applySyncToCollection(
      { ...collection, openApiSpec: { source: 'test', lastSyncedAt: 1000 } },
      preview,
      {
        addedOperationIds: [],
        updatedRequestIds: [],
        removeRequestIds: [],
      },
    );

    expect(result.requests).toHaveLength(2);
  });

  it('creates new folders for added requests that need them', () => {
    const existingFolder: Folder = { id: 'f1', name: 'pets', collectionId: 'col-1', createdAt: 1000, updatedAt: 1000 };
    const newFolder: Folder = { id: 'f2-new', name: 'users', collectionId: 'col-1', createdAt: 2000, updatedAt: 2000 };
    const collection = makeCollection(
      [makeRequest({ id: 'r1', operationId: 'listPets', url: '{{baseUrl}}/pets', folderId: 'f1' })],
      [existingFolder],
    );
    const incoming = makeCollection(
      [
        makeRequest({ id: 'r1-new', operationId: 'listPets', url: '{{baseUrl}}/pets', folderId: 'f1' }),
        makeRequest({ id: 'r2-new', operationId: 'listUsers', url: '{{baseUrl}}/users', folderId: 'f2-new' }),
      ],
      [existingFolder, newFolder],
    );

    const preview = buildSyncPreview(collection, incoming, 'hash-2');

    const result = applySyncToCollection(collection, preview, {
      addedOperationIds: ['listUsers'],
      updatedRequestIds: [],
      removeRequestIds: [],
    });

    expect(result.folders).toHaveLength(2);
    expect(result.folders.find(f => f.name === 'users')).toBeDefined();
  });

  it('updates spec metadata', () => {
    const collection = makeCollection(
      [makeRequest({ id: 'r1', operationId: 'listPets', url: '{{baseUrl}}/pets' })],
      [],
      { openApiSpec: { source: 'test.json', lastSyncedAt: 1000, specHash: 'hash-1' } },
    );
    const preview = buildSyncPreview(
      collection,
      makeCollection([makeRequest({ id: 'r1-new', operationId: 'listPets', url: '{{baseUrl}}/pets' })]),
      'hash-2',
    );

    const result = applySyncToCollection(collection, preview, {
      addedOperationIds: [],
      updatedRequestIds: [],
      removeRequestIds: [],
    });

    expect(result.openApiSpec!.specHash).toBe('hash-2');
    expect(result.openApiSpec!.lastSyncedAt).toBeGreaterThan(1000);
  });
});
