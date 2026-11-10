import { describe, expect, it } from 'vitest';
import { buildSavedGraphQLRequest, encodeGraphQLGetUrl } from '../src/request/build-proxy-request.ts';
import type { SavedRequest } from '../src/types.ts';

function savedGraphQLRequest(overrides: Partial<SavedRequest> = {}): SavedRequest {
  return {
    id: 'req-1',
    name: 'GetUser',
    requestType: 'graphql',
    method: 'POST',
    url: 'https://api.example.com/graphql',
    headers: { 'X-Custom': 'yes' },
    auth: { type: 'none' },
    collectionId: 'col-1',
    graphql: {
      document: 'query GetUser($id: ID!) { user(id: $id) { name } }',
      variables: '{"id":"123"}',
      transport: 'post',
    },
    ...overrides,
  };
}

describe('encodeGraphQLGetUrl', () => {
  it('encodes the document and variables as query parameters', () => {
    const url = new URL(encodeGraphQLGetUrl('https://api.example.com/graphql', 'query { ping }', { id: '1' }));

    expect(url.searchParams.get('query')).toBe('query { ping }');
    expect(url.searchParams.get('variables')).toBe('{"id":"1"}');
  });

  it('preserves existing query parameters and fragments', () => {
    const url = encodeGraphQLGetUrl('https://api.example.com/graphql?existing=1#frag', 'query { ping }');

    expect(url).toContain('existing=1');
    expect(url.endsWith('#frag')).toBe(true);
  });

  it('lets unresolved {{variable}} placeholders pass through', () => {
    const url = encodeGraphQLGetUrl('{{baseUrl}}/graphql', 'query { ping }');

    expect(url).toMatch(/^\{\{baseUrl\}\}\/graphql\?/);
  });
});

describe('buildSavedGraphQLRequest', () => {
  it('builds a POST body from the saved GraphQL config', () => {
    const request = buildSavedGraphQLRequest(savedGraphQLRequest());

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://api.example.com/graphql');
    expect(request.headers).toMatchObject({
      'X-Custom': 'yes',
      Accept: 'application/graphql-response+json, application/json;q=0.9',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(request.body ?? '')).toEqual({
      query: 'query GetUser($id: ID!) { user(id: $id) { name } }',
      variables: { id: '123' },
    });
  });

  it('encodes query operations as GET parameters', () => {
    const request = buildSavedGraphQLRequest(savedGraphQLRequest({
      method: 'GET',
      graphql: { document: 'query Users { users { id } }', variables: '', transport: 'get' },
    }));

    expect(request.method).toBe('GET');
    expect(request.body).toBeUndefined();
    expect(new URL(request.url).searchParams.get('query')).toContain('query Users');
  });

  it('rejects mutations sent using GET', () => {
    expect(() =>
      buildSavedGraphQLRequest(savedGraphQLRequest({
        method: 'GET',
        graphql: {
          document: 'mutation Rename { renameUser(name: "Ada") { id } }',
          variables: '',
          transport: 'get',
        },
      })),
    ).toThrow('GraphQL GET requests can only execute query operations');
  });

  it('falls back to the stored raw fields when no GraphQL config exists', () => {
    const request = buildSavedGraphQLRequest(savedGraphQLRequest({
      graphql: undefined,
      body: '{"query":"query { ping }"}',
      bodyType: 'json',
    }));

    expect(request.method).toBe('POST');
    expect(request.body).toBe('{"query":"query { ping }"}');
    expect(request.headers).toEqual({ 'X-Custom': 'yes' });
  });
});
