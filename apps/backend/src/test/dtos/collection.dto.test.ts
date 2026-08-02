import { describe, expect, it } from 'vitest';
import {
  addRequestSchema,
  createRequestPayloadSchema,
  updateRequestPayloadSchema,
  updateRequestSchema,
} from '../../dtos/collection.dto';

const baseRequest = {
  id: 'request-1',
  name: 'Users',
  method: 'POST',
  url: 'https://api.example.com/graphql',
  collectionId: 'collection-1',
};

describe('collection request DTOs', () => {
  it('accepts an empty GraphQL draft with its GraphQL configuration', () => {
    expect(addRequestSchema.safeParse({
      ...baseRequest,
      requestType: 'graphql',
      graphql: { document: '', variables: '', transport: 'post' },
    }).success).toBe(true);
  });

  it('rejects a GraphQL request without GraphQL configuration', () => {
    expect(addRequestSchema.safeParse({ ...baseRequest, requestType: 'graphql' }).success).toBe(false);
  });

  it('rejects contradictory HTTP and GraphQL fields', () => {
    expect(addRequestSchema.safeParse({
      ...baseRequest,
      requestType: 'graphql',
      body: '{}',
      graphql: { document: 'query { users { id } }', variables: '', transport: 'post' },
    }).success).toBe(false);
    expect(addRequestSchema.safeParse({
      ...baseRequest,
      requestType: 'http',
      graphql: { document: 'query { users { id } }', variables: '', transport: 'post' },
    }).success).toBe(false);
  });

  it('allows unrelated partial updates', () => {
    expect(updateRequestSchema.safeParse({ name: 'Renamed request' }).success).toBe(true);
    expect(updateRequestPayloadSchema.safeParse({ name: 'Renamed request' }).success).toBe(true);
  });

  it('validates route payloads without requiring path-owned fields', () => {
    expect(createRequestPayloadSchema.safeParse({
      name: 'Users',
      requestType: 'http',
      method: 'GET',
      url: 'https://example.com/users',
    }).success).toBe(true);
  });
});
