import { describe, it, expect } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';
import type { Folder, SavedRequest } from '../../../models/collection';
import { convertV3Operations } from '../../../utils/openapi/v3';

function makeDoc(paths: OpenAPIV3.PathsObject, opts?: {
  security?: OpenAPIV3.SecurityRequirementObject[];
  securitySchemes?: Record<string, OpenAPIV3.SecuritySchemeObject>;
}): OpenAPIV3.Document {
  return {
    openapi: '3.0.3',
    info: { title: 'Test', version: '1.0' },
    paths,
    ...(opts?.security ? { security: opts.security } : {}),
    ...(opts?.securitySchemes ? {
      components: { securitySchemes: opts.securitySchemes },
    } : {}),
  };
}

describe('convertV3Operations', () => {
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
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].url).toBe('{{baseUrl}}/pets');
    expect(requests[0].operationId).toBe('listPets');
    expect(requests[0].name).toBe('List pets');
    expect(requests[0].collectionId).toBe('col-1');
  });

  it('converts path parameters to {{placeholder}} syntax', () => {
    const doc = makeDoc({
      '/pets/{petId}': {
        get: {
          operationId: 'getPet',
          responses: { '200': { description: 'OK' } },
          parameters: [
            { name: 'petId', in: 'path', required: true, schema: { type: 'integer' } },
          ],
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(requests[0].url).toBe('{{baseUrl}}/pets/{{petId}}');
  });

  it('appends query parameters to URL', () => {
    const doc = makeDoc({
      '/pets': {
        get: {
          operationId: 'listPets',
          responses: { '200': { description: 'OK' } },
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'offset', in: 'query', schema: { type: 'integer' } },
          ],
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(requests[0].url).toBe('{{baseUrl}}/pets?limit=0&offset=0');
  });

  it('adds header parameters to headers map', () => {
    const doc = makeDoc({
      '/pets': {
        get: {
          operationId: 'listPets',
          responses: { '200': { description: 'OK' } },
          parameters: [
            { name: 'X-Request-Id', in: 'header', schema: { type: 'string' } },
          ],
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

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
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(folders).toHaveLength(2);
    expect(folders.map(f => f.name).sort()).toEqual(['pets', 'users']);
    expect(requests[0].folderId).toBe(folders.find(f => f.name === 'pets')!.id);
    expect(requests[1].folderId).toBe(folders.find(f => f.name === 'users')!.id);
  });

  it('groups multiple operations under the same tag into one folder', () => {
    const doc = makeDoc({
      '/pets': {
        get: {
          tags: ['pets'],
          operationId: 'listPets',
          responses: { '200': { description: 'OK' } },
        },
        post: {
          tags: ['pets'],
          operationId: 'createPet',
          responses: { '201': { description: 'Created' } },
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(folders).toHaveLength(1);
    expect(requests).toHaveLength(2);
    expect(requests[0].folderId).toBe(requests[1].folderId);
  });

  it('handles operations without tags (no folder)', () => {
    const doc = makeDoc({
      '/admin/stats': {
        get: {
          operationId: 'getStats',
          responses: { '200': { description: 'OK' } },
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(folders).toHaveLength(0);
    expect(requests[0].folderId).toBeUndefined();
  });

  it('generates synthetic operationId from method_path when missing', () => {
    const doc = makeDoc({
      '/pets': {
        get: {
          responses: { '200': { description: 'OK' } },
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(requests[0].operationId).toBe('get_/pets');
  });

  it('parses JSON request body with schema', () => {
    const doc = makeDoc({
      '/pets': {
        post: {
          operationId: 'createPet',
          responses: { '201': { description: 'Created' } },
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(requests[0].bodyType).toBe('json');
    const body = JSON.parse(requests[0].body!);
    expect(body).toEqual({ name: 'string', age: 0 });
    expect(requests[0].headers?.['Content-Type']).toBe('application/json');
  });

  it('parses form-data request body', () => {
    const doc = makeDoc({
      '/upload': {
        post: {
          operationId: 'upload',
          responses: { '200': { description: 'OK' } },
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(requests[0].bodyType).toBe('form-data');
    expect(requests[0].formDataEntries).toHaveLength(2);
    const fileEntry = requests[0].formDataEntries!.find(e => e.key === 'file');
    expect(fileEntry?.type).toBe('file');
    const textEntry = requests[0].formDataEntries!.find(e => e.key === 'description');
    expect(textEntry?.type).toBe('text');
  });

  it('extracts bearer auth from security schemes', () => {
    const doc = makeDoc(
      {
        '/secure': {
          get: {
            operationId: 'getSecure',
            security: [{ bearerAuth: [] }],
            responses: { '200': { description: 'OK' } },
          },
        },
      },
      {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer' },
        },
      },
    );
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(requests[0].auth).toEqual({
      type: 'bearer',
      bearer: { token: '' },
    });
  });

  it('extracts apiKey auth from security schemes', () => {
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
        securitySchemes: {
          apiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        },
      },
    );
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(requests[0].auth).toEqual({
      type: 'api-key',
      apiKey: { key: 'X-API-Key', value: '', addTo: 'header' },
    });
  });

  it('extracts basic auth from security schemes', () => {
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
        securitySchemes: {
          basicAuth: { type: 'http', scheme: 'basic' },
        },
      },
    );
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(requests[0].auth).toEqual({
      type: 'basic',
      basic: { username: '', password: '' },
    });
  });

  it('converts all HTTP methods', () => {
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
    const paths: OpenAPIV3.PathsObject = {
      '/test': {} as OpenAPIV3.PathItemObject,
    };
    for (const method of methods) {
      (paths['/test'] as any)[method] = {
        operationId: `${method}Test`,
        responses: { '200': { description: 'OK' } },
      };
    }
    const doc = makeDoc(paths);
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    expect(requests).toHaveLength(7);
    const requestMethods = requests.map(r => r.method);
    expect(requestMethods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']);
  });

  it('uses request body example when provided', () => {
    const doc = makeDoc({
      '/pets': {
        post: {
          operationId: 'createPet',
          responses: { '201': { description: 'Created' } },
          requestBody: {
            content: {
              'application/json': {
                example: { name: 'Buddy', age: 3 },
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    });
    const folders: Folder[] = [];
    const requests: SavedRequest[] = [];
    convertV3Operations(doc, 'col-1', folders, requests);

    const body = JSON.parse(requests[0].body!);
    expect(body).toEqual({ name: 'Buddy', age: 3 });
  });
});
