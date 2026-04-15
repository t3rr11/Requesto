import { describe, it, expect } from 'vitest';
import type { OpenAPIV2 } from 'openapi-types';
import type { Folder, SavedRequest } from '../../../types';
import { convertV2Operations } from '../../../helpers/openApi/v2';

function makeDoc(paths: OpenAPIV2.PathsObject, opts?: {
  security?: OpenAPIV2.SecurityRequirementObject[];
  securityDefinitions?: Record<string, OpenAPIV2.SecuritySchemeObject>;
}): OpenAPIV2.Document {
  return {
    swagger: '2.0',
    info: { title: 'Test', version: '1.0' },
    host: 'api.example.com',
    basePath: '/v1',
    schemes: ['https'],
    paths,
    ...opts,
  };
}

describe('convertV2Operations', () => {
  it('converts a basic GET operation', () => {
    const doc = makeDoc({
      '/pets': {
        get: {
          operationId: 'listPets',
          summary: 'List pets',
          responses: { '200': { description: 'OK' } },
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV2Operations(doc, 'col-1', folders, requests, 1000);

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].url).toBe('{{baseUrl}}/pets');
    expect(requests[0].operationId).toBe('listPets');
    expect(requests[0].name).toBe('List pets');
  });

  it('converts path parameters to {{placeholder}} syntax', () => {
    const doc = makeDoc({
      '/pets/{petId}': {
        get: {
          operationId: 'getPet',
          responses: { '200': { description: 'OK' } },
          parameters: [
            { name: 'petId', in: 'path', required: true, type: 'integer' },
          ],
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV2Operations(doc, 'col-1', folders, requests, 1000);

    expect(requests[0].url).toBe('{{baseUrl}}/pets/{{petId}}');
  });

  it('appends query parameters', () => {
    const doc = makeDoc({
      '/pets': {
        get: {
          operationId: 'listPets',
          responses: { '200': { description: 'OK' } },
          parameters: [
            { name: 'limit', in: 'query', type: 'integer' },
            { name: 'offset', in: 'query', type: 'integer' },
          ],
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV2Operations(doc, 'col-1', folders, requests, 1000);

    expect(requests[0].url).toBe('{{baseUrl}}/pets?limit=&offset=');
  });

  it('adds header parameters', () => {
    const doc = makeDoc({
      '/pets': {
        get: {
          operationId: 'listPets',
          responses: { '200': { description: 'OK' } },
          parameters: [
            { name: 'X-Request-Id', in: 'header', type: 'string' },
          ],
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV2Operations(doc, 'col-1', folders, requests, 1000);

    expect(requests[0].headers).toHaveProperty('X-Request-Id');
  });

  it('creates folders from tags', () => {
    const doc = makeDoc({
      '/pets': {
        get: {
          tags: ['pets'],
          operationId: 'listPets',
          responses: { '200': { description: 'OK' } },
        },
      },
      '/users': {
        get: {
          tags: ['users'],
          operationId: 'listUsers',
          responses: { '200': { description: 'OK' } },
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV2Operations(doc, 'col-1', folders, requests, 1000);

    expect(folders).toHaveLength(2);
    expect(folders.map(f => f.name).sort()).toEqual(['pets', 'users']);
  });

  it('parses body parameter as JSON', () => {
    const doc = makeDoc({
      '/pets': {
        post: {
          operationId: 'createPet',
          responses: { '201': { description: 'Created' } },
          parameters: [
            {
              name: 'body',
              in: 'body',
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          ],
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV2Operations(doc, 'col-1', folders, requests, 1000);

    expect(requests[0].bodyType).toBe('json');
    expect(requests[0].headers?.['Content-Type']).toBe('application/json');
    const body = JSON.parse(requests[0].body!);
    expect(body).toEqual({ name: 'string' });
  });

  it('parses formData parameters', () => {
    const doc = makeDoc({
      '/upload': {
        post: {
          operationId: 'upload',
          consumes: ['multipart/form-data'],
          responses: { '200': { description: 'OK' } },
          parameters: [
            { name: 'file', in: 'formData', type: 'file' },
            { name: 'description', in: 'formData', type: 'string' },
          ],
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV2Operations(doc, 'col-1', folders, requests, 1000);

    expect(requests[0].bodyType).toBe('form-data');
    expect(requests[0].formDataEntries).toHaveLength(2);
    expect(requests[0].formDataEntries![0].type).toBe('file');
    expect(requests[0].formDataEntries![1].type).toBe('text');
  });

  it('extracts basic auth', () => {
    const doc = makeDoc(
      {
        '/secure': {
          get: {
            operationId: 'getSecure',
            security: [{ basicAuth: [] }],
            responses: { '200': { description: 'OK' } },
          },
        },
      },
      {
        securityDefinitions: {
          basicAuth: { type: 'basic' },
        },
      },
    );
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV2Operations(doc, 'col-1', folders, requests, 1000);

    expect(requests[0].auth).toEqual({
      type: 'basic',
      basic: { username: '', password: '' },
    });
  });

  it('extracts apiKey auth', () => {
    const doc = makeDoc(
      {
        '/secure': {
          get: {
            operationId: 'getSecure',
            security: [{ apiKeyAuth: [] }],
            responses: { '200': { description: 'OK' } },
          },
        },
      },
      {
        securityDefinitions: {
          apiKeyAuth: { type: 'apiKey', name: 'X-API-Key', in: 'header' },
        },
      },
    );
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV2Operations(doc, 'col-1', folders, requests, 1000);

    expect(requests[0].auth).toEqual({
      type: 'api-key',
      apiKey: { key: 'X-API-Key', value: '', addTo: 'header' },
    });
  });

  it('generates synthetic operationId when missing', () => {
    const doc = makeDoc({
      '/pets': {
        get: {
          responses: { '200': { description: 'OK' } },
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV2Operations(doc, 'col-1', folders, requests, 1000);

    expect(requests[0].operationId).toBe('get_/pets');
  });
});
