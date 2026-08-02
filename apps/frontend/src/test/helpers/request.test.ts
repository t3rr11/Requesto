import { describe, expect, it } from 'vitest';
import type { RequestFormData } from '../../forms/schemas/requestFormSchema';
import {
  buildGraphQLIntrospectionRequest,
  buildRequestFromFormData,
  buildSavePayloadFromFormData,
  getGraphQLOperations,
  parseGraphQLIntrospectionResponse,
} from '../../helpers/request';
import { graphql, getIntrospectionQuery, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';

function createFormData(overrides: Partial<RequestFormData> = {}): RequestFormData {
  return {
    requestType: 'graphql',
    method: 'POST',
    url: 'https://api.example.com/graphql',
    headers: [],
    params: [],
    body: '',
    bodyType: 'json',
    formDataEntries: [],
    auth: { type: 'none' },
    graphqlDocument: 'query GetUser($id: ID!) { user(id: $id) { name } }',
    graphqlVariables: '{"id":"123"}',
    graphqlTransport: 'post',
    ...overrides,
  };
}

describe('GraphQL request helpers', () => {
  it('lists operations without requiring a valid selection', () => {
    expect(getGraphQLOperations('query Users { users { id } } mutation Create { createUser { id } }')).toEqual([
      { name: 'Users', operation: 'query' },
      { name: 'Create', operation: 'mutation' },
    ]);
    expect(getGraphQLOperations('query {')).toEqual([]);
  });

  it('builds a standards-shaped POST request', () => {
    const request = buildRequestFromFormData(createFormData());

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://api.example.com/graphql');
    expect(request.headers).toMatchObject({
      Accept: 'application/graphql-response+json, application/json;q=0.9',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(request.body ?? '')).toEqual({
      query: 'query GetUser($id: ID!) { user(id: $id) { name } }',
      variables: { id: '123' },
    });
  });

  it('encodes query operations as GET parameters', () => {
    const request = buildRequestFromFormData(createFormData({ graphqlTransport: 'get' }));
    const url = new URL(request.url);

    expect(request.method).toBe('GET');
    expect(request.body).toBeUndefined();
    expect(url.searchParams.has('operationName')).toBe(false);
    expect(url.searchParams.get('variables')).toBe('{"id":"123"}');
    expect(url.searchParams.get('query')).toContain('query GetUser');
  });

  it('rejects mutations sent using GET', () => {
    expect(() =>
      buildRequestFromFormData(
        createFormData({
          graphqlDocument: 'mutation Rename { renameUser(name: "Ada") { id } }',
          graphqlTransport: 'get',
        }),
      ),
    ).toThrow('GraphQL GET requests can only execute query operations');
  });

  it('requires variables to be a JSON object', () => {
    expect(() => buildRequestFromFormData(createFormData({ graphqlVariables: '[]' }))).toThrow(
      'GraphQL variables must be a JSON object',
    );
  });

  it('rejects an empty GraphQL document', () => {
    expect(() => buildRequestFromFormData(createFormData({ graphqlDocument: '' }))).toThrow(
      'GraphQL query is required',
    );
  });

  it('persists GraphQL fields without HTTP body fields', () => {
    const payload = buildSavePayloadFromFormData(createFormData({ graphqlSchemaProfileId: 'schema-profile-1' }));

    expect(payload).toMatchObject({
      requestType: 'graphql',
      method: 'POST',
      graphql: {
        document: 'query GetUser($id: ID!) { user(id: $id) { name } }',
        variables: '{"id":"123"}',
        transport: 'post',
        schemaProfileId: 'schema-profile-1',
      },
    });
    expect(payload.body).toBeUndefined();
    expect(payload.bodyType).toBeUndefined();
    expect(payload.formDataEntries).toBeUndefined();
  });

  it('rejects documents containing multiple operations', () => {
    expect(() => buildRequestFromFormData(createFormData({
      graphqlDocument: 'query Users { users { id } } mutation Create { createUser { id } }',
    }))).toThrow('Multiple GraphQL operations are not supported. Keep one operation in the query.');
  });

  it('builds introspection independently of an empty GraphQL draft', () => {
    const request = buildGraphQLIntrospectionRequest(createFormData({ graphqlDocument: '' }));
    const body = JSON.parse(request.body ?? '');

    expect(request.method).toBe('POST');
    expect(body.operationName).toBe('IntrospectionQuery');
    expect(body.query).toContain('__schema');
  });

  it('builds a client schema from an introspection response', async () => {
    const sourceSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { greeting: { type: GraphQLString } },
      }),
    });
    const introspection = await graphql({ schema: sourceSchema, source: getIntrospectionQuery() });
    const schema = parseGraphQLIntrospectionResponse({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(introspection),
      bodyEncoding: 'utf8',
      duration: 5,
    });

    expect(schema.getQueryType()?.getFields().greeting).toBeDefined();
  });

  it('surfaces GraphQL introspection errors', () => {
    expect(() => parseGraphQLIntrospectionResponse({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: JSON.stringify({ errors: [{ message: 'Introspection is disabled' }] }),
      bodyEncoding: 'utf8',
      duration: 5,
    })).toThrow('Introspection is disabled');
  });
});
