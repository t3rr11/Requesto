import { describe, expect, it } from 'vitest';
import { buildDisplayItems, resolveFolderIds, runCollections } from '../src/engine/runner';
import type { Collection } from '../src/types';
import type { ProxyResponse } from 'requesto-backend/models/proxy';

function collection(): Collection {
  return {
    id: 'c1',
    name: 'API',
    folders: [
      { id: 'f-users', name: 'Users', collectionId: 'c1' },
      { id: 'f-nested', name: 'Nested', parentId: 'f-users', collectionId: 'c1' },
    ],
    requests: [
      { id: 'r-root', name: 'Root', method: 'GET', url: '/', collectionId: 'c1', order: 0 },
      { id: 'r-users', name: 'In Users', method: 'GET', url: '/', collectionId: 'c1', folderId: 'f-users', order: 0 },
      { id: 'r-nested', name: 'In Nested', method: 'GET', url: '/', collectionId: 'c1', folderId: 'f-nested', order: 0 },
    ],
  };
}

const okResponse: ProxyResponse = {
  status: 200,
  statusText: 'OK',
  headers: {},
  body: '{}',
  bodyEncoding: 'utf8',
  duration: 5,
};

describe('buildDisplayItems', () => {
  it('orders folders before root requests, depth tracked, nested folders included', () => {
    const items = buildDisplayItems(collection());
    expect(items.map((i) => (i.kind === 'folder' ? `folder:${i.name}` : `req:${i.request.name}`))).toEqual([
      'folder:Users',
      'req:In Users',
      'folder:Nested',
      'req:In Nested',
      'req:Root',
    ]);
    expect(items.map((i) => i.depth)).toEqual([0, 1, 1, 2, 0]);
  });

  it('filters to a folder subtree when folder ids are given', () => {
    const ids = resolveFolderIds(collection(), ['users']);
    const items = buildDisplayItems(collection(), ids ?? undefined);
    expect(items.filter((i) => i.kind === 'request').map((i) => i.request.name)).toEqual([
      'In Users',
      'In Nested',
    ]);
  });

  it('resolves folder selectors by name or id, case-insensitive', () => {
    expect(resolveFolderIds(collection(), ['Nested'])?.has('f-nested')).toBe(true);
    expect(resolveFolderIds(collection(), ['F-USERS'])?.has('f-users')).toBe(true);
    expect(resolveFolderIds(collection(), ['missing'])).toEqual(new Set());
  });
});

describe('runCollections', () => {
  const send = async () => okResponse;

  it('runs pre-request script, substitution, and test script in order', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [
        {
          id: 'r1',
          name: 'Chained',
          method: 'GET',
          url: '{{baseUrl}}/x',
          collectionId: 'c1',
          preRequestScript: `environment.set('baseUrl', 'http://from-script');`,
          testScript: `test('ok', () => { expect(response.status).toBe(200); });`,
        },
      ],
    };
    const sent: string[] = [];
    const summary = await runCollections({
      collections: [col],
      environment: { id: 'e', name: 'env', variables: [{ key: 'baseUrl', value: 'http://default', enabled: true }] },
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      send: async (req) => {
        sent.push(req.url);
        return okResponse;
      },
    });

    expect(sent).toEqual(['http://from-script/x']);
    expect(summary.passed).toBe(1);
    expect(summary.passedTests).toBe(1);
  });

  it('marks failing assertions as failed', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [
        {
          id: 'r1',
          name: 'Bad',
          method: 'GET',
          url: '/',
          collectionId: 'c1',
          testScript: `test('nope', () => { expect(1).toBe(2); });`,
        },
      ],
    };
    const summary = await runCollections({ collections: [col], environment: null, oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }), send });
    expect(summary.failed).toBe(1);
    expect(summary.passedTests).toBe(0);
  });

  it('records transport errors with messages and continues', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [
        { id: 'r1', name: 'Dead', method: 'GET', url: '/dead', collectionId: 'c1' },
        { id: 'r2', name: 'Alive', method: 'GET', url: '/alive', collectionId: 'c1' },
      ],
    };
    const summary = await runCollections({
      collections: [col],
      environment: null,
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      send: async (req) => {
        if (req.url === '/dead') throw new Error('connect ECONNREFUSED');
        return okResponse;
      },
    });
    expect(summary.errored).toBe(1);
    expect(summary.results[0].error).toContain('ECONNREFUSED');
    expect(summary.passed).toBe(1);
  });

  it('bail stops after the first failure and marks the rest skipped', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [
        { id: 'r1', name: 'One', method: 'GET', url: '/', collectionId: 'c1' },
        {
          id: 'r2',
          name: 'Two',
          method: 'GET',
          url: '/',
          collectionId: 'c1',
          testScript: `test('fail', () => { expect(1).toBe(2); });`,
        },
        { id: 'r3', name: 'Three', method: 'GET', url: '/', collectionId: 'c1' },
      ],
    };
    const summary = await runCollections({ collections: [col], environment: null, oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }), send, bail: true });
    expect(summary.bailTriggered).toBe(true);
    expect(summary.results.map((r) => r.status)).toEqual(['passed', 'failed', 'skipped']);
    expect(summary.skipped).toBe(1);
  });

  it('runs nothing from collections without the selected folder', async () => {
    const matching: Collection = {
      id: 'c1',
      name: 'Has Users',
      folders: [{ id: 'f-users', name: 'Users', collectionId: 'c1' }],
      requests: [{ id: 'r1', name: 'In Users', method: 'GET', url: '/', collectionId: 'c1', folderId: 'f-users' }],
    };
    const other: Collection = {
      id: 'c2',
      name: 'Other',
      folders: [{ id: 'f-other', name: 'Other', collectionId: 'c2' }],
      requests: [
        { id: 'r2', name: 'In Other', method: 'GET', url: '/', collectionId: 'c2', folderId: 'f-other' },
        { id: 'r3', name: 'Root Req', method: 'GET', url: '/', collectionId: 'c2' },
      ],
    };
    const summary = await runCollections({
      collections: [matching, other],
      environment: null,
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      send,
      folders: ['Users'],
    });
    // Only the matching collection's folder subtree runs — the other collection
    // is skipped entirely rather than falling back to all of its requests.
    expect(summary.results.map((r) => r.collectionId)).toEqual(['c1']);
  });

  it('emits ordered progress events for streaming reporters', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [
        { id: 'r1', name: 'One', method: 'GET', url: '/one', collectionId: 'c1' },
        { id: 'r2', name: 'Two', method: 'GET', url: '/two', collectionId: 'c1' },
      ],
    };
    const events: string[] = [];
    await runCollections({
      collections: [col],
      environment: null,
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      send,
      onEvent: (event) => {
        if (event.type === 'collection-start') events.push(`collection:${event.collectionName}`);
        if (event.type === 'request-start') events.push(`start:${event.request.name}`);
        if (event.type === 'request-end') events.push(`end:${event.result.request.name}:${event.result.status}`);
      },
    });

    expect(events).toEqual([
      'collection:API',
      'start:One',
      'end:One:passed',
      'start:Two',
      'end:Two:passed',
    ]);
  });

  it('marks skipped requests through request-end events when bailing', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [
        { id: 'r1', name: 'One', method: 'GET', url: '/one', collectionId: 'c1' },
        { id: 'r2', name: 'Two', method: 'GET', url: '/two', collectionId: 'c1' },
      ],
    };
    const events: string[] = [];
    await runCollections({
      collections: [col],
      environment: null,
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      send: async () => {
        throw new Error('boom');
      },
      bail: true,
      onEvent: (event) => {
        if (event.type === 'request-end') events.push(`${event.result.request.name}:${event.result.status}`);
      },
    });

    expect(events).toEqual(['One:error', 'Two:skipped']);
  });

  it('passes --insecure through to the request', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [{ id: 'r1', name: 'A', method: 'GET', url: '/', collectionId: 'c1' }],
    };
    const seen: boolean[] = [];
    await runCollections({
      collections: [col],
      environment: null,
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      send: async (req) => {
        seen.push(req.insecureTls === true);
        return okResponse;
      },
      insecure: true,
    });
    expect(seen).toEqual([true]);
  });
});
