import { describe, expect, it } from 'vitest';
import { runCollections } from '../src/runner/run.ts';
import { nodeScriptRunner } from '../src/scripts/node-scripts.ts';
import { buildCollectionItems, resolveFolderIds } from '../src/runner/display.ts';
import type { Collection, ProxyResponse } from '../src/types.ts';

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

function responseOf(status: number, statusText: string, body: string): ProxyResponse {
  return { status, statusText, headers: {}, body, bodyEncoding: 'utf8', duration: 5 };
}

function singleRequest(name: string, extra: Partial<Collection['requests'][number]> = {}): Collection {
  return {
    id: 'c1',
    name: 'API',
    folders: [],
    requests: [{ id: 'r1', name, method: 'GET', url: `/`, collectionId: 'c1', ...extra }],
  };
}

describe('buildCollectionItems', () => {
  it('orders folders before root requests, depth tracked, nested folders included', () => {
    const items = buildCollectionItems(collection());
    expect(items.map((i) => (i.kind === 'folder' ? `folder:${i.folder.name}` : `req:${i.request.name}`))).toEqual([
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
    const items = buildCollectionItems(collection(), ids ?? undefined);
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
      scripts: nodeScriptRunner,
      send: async (req) => {
        sent.push(req.url);
        return okResponse;
      },
    });

    expect(sent).toEqual(['http://from-script/x']);
    expect(summary.passed).toBe(1);
    expect(summary.passedTests).toBe(1);
  });

  it('chains script values across collections into GraphQL GET and POST requests', async () => {
    const collections: Collection[] = [
      {
        id: 'c1', name: 'Login', folders: [],
        requests: [{
          id: 'r1', name: 'Login', method: 'GET', url: 'http://example.test', collectionId: 'c1',
          testScript: `environment.set('token', 'a"b'); environment.set('userId', 42);`,
        }],
      },
      {
        id: 'c2', name: 'GraphQL', folders: [],
        requests: (['get', 'post'] as const).map((transport, index) => ({
          id: `g${index}`, name: transport, method: 'POST', url: '{{baseUrl}}/graphql?existing=1',
          collectionId: 'c2', requestType: 'graphql' as const,
          graphql: {
            document: 'query User($id: Int, $token: String) { user(id: $id) { name } }',
            variables: '{"id":"{{userId}}","token":"{{token}}"}',
            transport,
          },
        })),
      },
    ];
    const sent: { url: string; body?: string }[] = [];
    const summary = await runCollections({
      collections,
      environment: { id: 'e', name: 'env', variables: [{ key: 'baseUrl', value: 'http://example.test', enabled: true }] },
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      scripts: nodeScriptRunner,
      send: async (req) => { sent.push(req); return okResponse; },
    });

    expect(summary.errored).toBe(0);
    const getUrl = new URL(sent[1].url);
    expect(getUrl.searchParams.get('existing')).toBe('1');
    expect(JSON.parse(getUrl.searchParams.get('variables')!)).toEqual({ id: 42, token: 'a"b' });
    expect(JSON.parse(sent[2].body!).variables).toEqual({ id: 42, token: 'a"b' });
  });

  it('keeps response-string IDs string-typed when chained into GraphQL variables', async () => {
    // Regression: a GraphQL `ID` read from a response is a JS string; it must
    // not be re-typed as Number (from its stringified content) and then
    // un-quoted by JSON-aware substitution, or servers reject the request
    // with `Expected a string for type 'ID', got Number(...)`.
    const collections: Collection[] = [
      {
        id: 'c1', name: 'Fetch', folders: [],
        requests: [{
          id: 'r1', name: 'Fetch', method: 'GET', url: 'http://example.test', collectionId: 'c1',
          testScript: `environment.set('appId', response.json().data.applicationByName.id);`,
        }],
      },
      {
        id: 'c2', name: 'GraphQL', folders: [],
        requests: [{
          id: 'g1', name: 'post', method: 'POST', url: 'http://example.test/graphql',
          collectionId: 'c2', requestType: 'graphql' as const,
          graphql: {
            document: 'query GetRoleRefs($appId: ID!) { adminRole: roleByName(applicationId: $appId) { id } }',
            variables: '{"appId":"{{appId}}"}',
            transport: 'post',
          },
        }],
      },
    ];
    const sent: { url: string; body?: string }[] = [];
    const summary = await runCollections({
      collections,
      environment: { id: 'e', name: 'env', variables: [] },
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      scripts: nodeScriptRunner,
      send: async (req) => {
        sent.push(req);
        return responseOf(200, 'OK', '{"data":{"applicationByName":{"id":"1001"}}}');
      },
    });

    expect(summary.errored).toBe(0);
    const variables = JSON.parse(sent[1].body!).variables;
    expect(variables).toEqual({ appId: '1001' });
    expect(typeof variables.appId).toBe('string');
  });

  it('unquotes number-typed variables in JSON bodies (script-created variables inherit type)', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [
        {
          id: 'r1',
          name: 'Typed',
          method: 'POST',
          url: 'http://x.local',
          body: '{"userId": "{{userId}}", "name": "{{name}}"}',
          bodyType: 'json',
          collectionId: 'c1',
          preRequestScript: `environment.set('userId', 42); environment.set('name', 'alice');`,
        },
      ],
    };
    const sent: string[] = [];
    await runCollections({
      collections: [col],
      environment: { id: 'e', name: 'env', variables: [] },
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      scripts: nodeScriptRunner,
      send: async (req) => {
        sent.push(req.body ?? '');
        return okResponse;
      },
    });
    expect(sent).toEqual(['{"userId": 42, "name": "alice"}']);
  });

  it('unquotes number/boolean variables declared with a type in the environment', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [
        {
          id: 'r1',
          name: 'Typed env',
          method: 'POST',
          url: 'http://x.local',
          body: '{"count": "{{count}}", "flag": "{{flag}}"}',
          bodyType: 'json',
          collectionId: 'c1',
        },
      ],
    };
    const sent: string[] = [];
    await runCollections({
      collections: [col],
      environment: {
        id: 'e',
        name: 'env',
        variables: [
          { key: 'count', value: '7', enabled: true, type: 'number' },
          { key: 'flag', value: 'true', enabled: true, type: 'boolean' },
        ],
      },
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      scripts: nodeScriptRunner,
      send: async (req) => {
        sent.push(req.body ?? '');
        return okResponse;
      },
    });
    expect(sent).toEqual(['{"count": 7, "flag": true}']);
  });

  it('resolves nested variable references (value pointing at another variable)', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [{ id: 'r1', name: 'Nested', method: 'GET', url: '{{baseUrl}}/x', collectionId: 'c1' }],
    };
    const sent: string[] = [];
    await runCollections({
      collections: [col],
      environment: {
        id: 'e',
        name: 'env',
        variables: [
          { key: 'baseUrl', value: '{{requestoServerUrl}}', enabled: true },
          { key: 'requestoServerUrl', value: 'http://127.0.0.1:41000', enabled: true },
        ],
      },
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      scripts: nodeScriptRunner,
      send: async (req) => {
        sent.push(req.url);
        return okResponse;
      },
    });
    expect(sent).toEqual(['http://127.0.0.1:41000/x']);
  });

  it('leaves cyclic variable references unresolved instead of looping', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [{ id: 'r1', name: 'Cyclic', method: 'GET', url: '{{a}}', collectionId: 'c1' }],
    };
    const sent: string[] = [];
    await runCollections({
      collections: [col],
      environment: {
        id: 'e',
        name: 'env',
        variables: [
          { key: 'a', value: '{{b}}', enabled: true },
          { key: 'b', value: '{{a}}', enabled: true },
        ],
      },
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      scripts: nodeScriptRunner,
      send: async (req) => {
        sent.push(req.url);
        return okResponse;
      },
    });
    expect(sent[0]).toContain('{{');
  });

  it('skips collections matched by exclude selectors (name or id, case-insensitive)', async () => {
    const one: Collection = {
      id: 'c1',
      name: 'SSE',
      folders: [],
      requests: [{ id: 'r1', name: 'Stream', method: 'GET', url: '/stream', collectionId: 'c1' }],
    };
    const two: Collection = {
      id: 'c2',
      name: 'Rest',
      folders: [],
      requests: [{ id: 'r2', name: 'Ping', method: 'GET', url: '/ping', collectionId: 'c2' }],
    };
    const summary = await runCollections({
      collections: [one, two],
      environment: null,
      oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      send,
      scripts: nodeScriptRunner,
      excludeCollections: ['sse'],
    });
    expect(summary.results.map((r) => r.collectionId)).toEqual(['c2']);
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
    const summary = await runCollections({ collections: [col], environment: null, oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      scripts: nodeScriptRunner, send });
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
      scripts: nodeScriptRunner,
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
    const summary = await runCollections({ collections: [col], environment: null, oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
      scripts: nodeScriptRunner, send, bail: true });
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
      scripts: nodeScriptRunner,
      send,
      folders: ['Users'],
    });
    // Only the matching collection's folder subtree runs: the other collection
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
      scripts: nodeScriptRunner,
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
      scripts: nodeScriptRunner,
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
      scripts: nodeScriptRunner,
      send: async (req) => {
        seen.push(req.insecureTls === true);
        return okResponse;
      },
      insecure: true,
    });
    expect(seen).toEqual([true]);
  });
});

describe('runCollections warnings', () => {
  const baseOpts = {
    environment: null as null,
    oauthResolver: async () => ({ accessToken: 't', tokenType: 'Bearer' }),
    scripts: nodeScriptRunner,
  };

  it('warns on 500 with no tests, and on 404', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [
        { id: 'r1', name: 'Boom', method: 'GET', url: '/boom', collectionId: 'c1' },
        { id: 'r2', name: 'Missing', method: 'GET', url: '/missing', collectionId: 'c1' },
      ],
    };
    const summary = await runCollections({
      ...baseOpts,
      collections: [col],
      send: async (req) => (req.url === '/boom'
        ? responseOf(500, 'Internal Server Error', 'oops')
        : responseOf(404, 'Not Found', 'nope')),
    });
    expect(summary.results.map((r) => r.status)).toEqual(['warned', 'warned']);
    expect(summary.results[0]).toMatchObject({
      warning: 'HTTP 500 Internal Server Error',
      warningKind: 'http-status',
    });
    expect(summary.warned).toBe(2);
    expect(summary.passed).toBe(0);
    expect(summary.failed).toBe(0);
  });

  it('500 with at least one passing test stays passed', async () => {
    const summary = await runCollections({
      ...baseOpts,
      collections: [
        singleRequest('Asserted', {
          testScript: `test('500 expected', () => { expect(response.status).toBe(500); });`,
        }),
      ],
      send: async () => responseOf(500, 'Internal Server Error', 'oops'),
    });
    expect(summary.results[0].status).toBe('passed');
    expect(summary.warned).toBe(0);
  });

  it('500 with a failing test is failed (warn suppressed)', async () => {
    const summary = await runCollections({
      ...baseOpts,
      collections: [
        singleRequest('Bad', {
          testScript: `test('200 expected', () => { expect(response.status).toBe(200); });`,
        }),
      ],
      send: async () => responseOf(500, 'Internal Server Error', 'oops'),
    });
    expect(summary.results[0].status).toBe('failed');
    expect(summary.results[0].warning).toBeUndefined();
  });

  it('warns on HTTP 200 GraphQL errors envelope (POST body transport)', async () => {
    const summary = await runCollections({
      ...baseOpts,
      collections: [
        singleRequest('Graphql', { requestType: 'graphql', graphql: { document: '{ user }', variables: '{}', transport: 'post' } }),
      ],
      send: async () =>
        responseOf(200, 'OK', JSON.stringify({ errors: [{ message: 'Field "user" not found' }], data: null })),
    });
    expect(summary.results[0]).toMatchObject({
      status: 'warned',
      warning: 'Field "user" not found',
      warningKind: 'graphql-errors',
    });
  });

  it('warns on HTTP 200 GraphQL errors envelope (GET transport)', async () => {
    const summary = await runCollections({
      ...baseOpts,
      collections: [
        singleRequest('Graphql', { requestType: 'graphql', graphql: { document: '{ user }', variables: '{}', transport: 'get' } }),
      ],
      send: async () =>
        responseOf(200, 'OK', JSON.stringify({ errors: [{ message: 'Unauthorized' }], data: null })),
    });
    expect(summary.results[0]).toMatchObject({ status: 'warned', warningKind: 'graphql-errors' });
  });

  it('warns on a plain (non-GraphQL) 200 response with an errors envelope', async () => {
    const summary = await runCollections({
      ...baseOpts,
      collections: [singleRequest('Envelope')],
      send: async () =>
        responseOf(200, 'OK', JSON.stringify({ errors: [{ message: 'Partial failure' }], data: { item: 1 } })),
    });
    expect(summary.results[0]).toMatchObject({ status: 'warned', warning: 'Partial failure' });
  });

  it('HTTP 200 with a clean GraphQL payload stays passed', async () => {
    const summary = await runCollections({
      ...baseOpts,
      collections: [
        singleRequest('Graphql', { requestType: 'graphql', graphql: { document: '{ user { name } }', variables: '{}', transport: 'post' } }),
      ],
      send: async () => responseOf(200, 'OK', JSON.stringify({ data: { user: { name: 'Ada' } } })),
    });
    expect(summary.results[0].status).toBe('passed');
    expect(summary.warned).toBe(0);
  });

  it('warnings:httpErrorStatuses=false keeps old passing semantics', async () => {
    const summary = await runCollections({
      ...baseOpts,
      collections: [
        singleRequest('Boom'),
        singleRequest('Graphql', { requestType: 'graphql', graphql: { document: '{ user }', variables: '{}', transport: 'post' } }),
      ],
      send: async () =>
        responseOf(200, 'OK', JSON.stringify({ errors: [{ message: 'Field "user" not found' }], data: null })),
      warnings: { httpErrorStatuses: false },
    });
    expect(summary.results.map((r) => r.status)).toEqual(['passed', 'passed']);
    expect(summary.warned).toBe(0);
  });

  it('warned entries count in the summary but do not trigger bail', async () => {
    const col: Collection = {
      id: 'c1',
      name: 'API',
      folders: [],
      requests: [
        { id: 'r1', name: 'Boom', method: 'GET', url: '/boom', collectionId: 'c1' },
        { id: 'r2', name: 'Ok', method: 'GET', url: '/ok', collectionId: 'c1' },
        { id: 'r3', name: 'Also Boom', method: 'GET', url: '/boom', collectionId: 'c1' },
      ],
    };
    const summary = await runCollections({
      ...baseOpts,
      collections: [col],
      bail: true,
      send: async (req) => (req.url === '/boom' ? responseOf(500, 'Internal Server Error', 'oops') : okResponse),
    });
    expect(summary.warned).toBe(2);
    expect(summary.bailTriggered).toBe(false);
    expect(summary.results.map((r) => r.status)).toEqual(['warned', 'passed', 'warned']);
  });

  it('emits warned statuses through request-end events', async () => {
    const events: string[] = [];
    await runCollections({
      ...baseOpts,
      collections: [singleRequest('Boom')],
      send: async () => responseOf(500, 'Internal Server Error', 'oops'),
      onEvent: (event) => {
        if (event.type === 'request-end') events.push(`${event.result.request.name}:${event.result.status}`);
      },
    });
    expect(events).toEqual(['Boom:warned']);
  });
});
