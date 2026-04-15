import { describe, it, expect } from 'vitest';
import path from 'path';
import { importOpenApiSpec } from '../../../utils/openapi/parser';

const FIXTURES = path.resolve(__dirname, 'fixtures');

describe('importOpenApiSpec', () => {
  describe('OpenAPI 3.0 spec', () => {
    it('parses a local OpenAPI 3.0 JSON file', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));

      expect(result.collection).toBeDefined();
      expect(result.collection.name).toBe('Test Pet API');
      expect(result.specHash).toBeTruthy();
    });

    it('creates correct number of requests', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));

      // Paths: GET /pets, POST /pets, GET /pets/{petId}, PUT /pets/{petId},
      // DELETE /pets/{petId}, POST /pets/{petId}/photo, GET /users, GET /admin/stats
      expect(result.collection.requests).toHaveLength(8);
    });

    it('creates folders from tags', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const folderNames = result.collection.folders.map(f => f.name).sort();

      expect(folderNames).toEqual(['pets', 'users']);
    });

    it('maps operations to correct folders', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const petsFolder = result.collection.folders.find(f => f.name === 'pets')!;
      const petsRequests = result.collection.requests.filter(r => r.folderId === petsFolder.id);

      // listPets, createPet, getPet, updatePet, deletePet, uploadPetPhoto
      expect(petsRequests).toHaveLength(6);
    });

    it('puts untagged operations at root level', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const adminReq = result.collection.requests.find(r => r.operationId === 'getAdminStats')!;

      expect(adminReq.folderId).toBeUndefined();
    });

    it('extracts path parameters as {{placeholders}}', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const getPet = result.collection.requests.find(r => r.operationId === 'getPet')!;

      expect(getPet.url).toContain('{{petId}}');
      expect(getPet.url).toBe('{{baseUrl}}/pets/{{petId}}');
    });

    it('extracts query parameters in URL', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const listPets = result.collection.requests.find(r => r.operationId === 'listPets')!;

      expect(listPets.url).toContain('?limit=');
    });

    it('extracts header parameters', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const listPets = result.collection.requests.find(r => r.operationId === 'listPets')!;

      expect(listPets.headers).toHaveProperty('X-Request-Id');
    });

    it('generates JSON body from schema', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const createPet = result.collection.requests.find(r => r.operationId === 'createPet')!;

      expect(createPet.bodyType).toBe('json');
      expect(createPet.body).toBeTruthy();
      const body = JSON.parse(createPet.body!);
      expect(body).toHaveProperty('name', 'Buddy'); // from schema example
      expect(body).toHaveProperty('species', 'dog'); // first enum
      expect(body).toHaveProperty('age', 0);
      expect(body).toHaveProperty('vaccinated', false);
      expect(body).toHaveProperty('tags');
    });

    it('parses form-data uploads', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const upload = result.collection.requests.find(r => r.operationId === 'uploadPetPhoto')!;

      expect(upload.bodyType).toBe('form-data');
      expect(upload.formDataEntries).toHaveLength(2);
    });

    it('extracts bearer auth', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const listUsers = result.collection.requests.find(r => r.operationId === 'listUsers')!;

      expect(listUsers.auth).toEqual({
        type: 'bearer',
        bearer: { token: '' },
      });
    });

    it('extracts apiKey auth', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const adminStats = result.collection.requests.find(r => r.operationId === 'getAdminStats')!;

      expect(adminStats.auth).toEqual({
        type: 'api-key',
        apiKey: { key: 'X-API-Key', value: '', addTo: 'header' },
      });
    });

    it('extracts server URLs as environment variables', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));

      expect(result.environments).toHaveLength(2);
      expect(result.environments[0]).toEqual({
        key: 'baseUrl',
        value: 'https://api.example.com/v1',
        enabled: true,
      });
      expect(result.environments[1]).toEqual({
        key: 'baseUrl_1',
        value: 'https://staging.example.com/v1',
        enabled: false,
      });
    });

    it('uses custom name when provided', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'), {
        name: 'My Custom API',
      });

      expect(result.collection.name).toBe('My Custom API');
    });

    it('sets openApiSpec metadata when linkSpec is true', async () => {
      const specPath = path.join(FIXTURES, 'openapi-v3.json');
      const result = await importOpenApiSpec(specPath, { linkSpec: true });

      expect(result.collection.openApiSpec).toBeDefined();
      expect(result.collection.openApiSpec!.source).toBe(specPath);
      expect(result.collection.openApiSpec!.specHash).toBe(result.specHash);
      expect(result.collection.openApiSpec!.lastSyncedAt).toBeGreaterThan(0);
    });

    it('does not set openApiSpec metadata when linkSpec is false', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'), {
        linkSpec: false,
      });

      expect(result.collection.openApiSpec).toBeUndefined();
    });

    it('sets operationId on all requests', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));

      for (const req of result.collection.requests) {
        expect(req.operationId).toBeTruthy();
      }
    });

    it('produces a valid specHash', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));

      // SHA-256 hash should be 64 hex chars
      expect(result.specHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces deterministic specHash', async () => {
      const r1 = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));
      const r2 = await importOpenApiSpec(path.join(FIXTURES, 'openapi-v3.json'));

      expect(r1.specHash).toBe(r2.specHash);
    });
  });

  describe('Swagger 2.0 spec', () => {
    it('parses a local Swagger 2.0 JSON file', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'swagger-v2.json'));

      expect(result.collection).toBeDefined();
      expect(result.collection.name).toBe('Test Pet API v2');
    });

    it('creates correct number of requests', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'swagger-v2.json'));

      // GET /pets, POST /pets, GET /pets/{petId}, GET /users
      expect(result.collection.requests).toHaveLength(4);
    });

    it('extracts baseUrl from host + basePath + scheme', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'swagger-v2.json'));

      expect(result.environments).toHaveLength(1);
      expect(result.environments[0]).toEqual({
        key: 'baseUrl',
        value: 'https://api.example.com/v1',
        enabled: true,
      });
    });

    it('parses body parameters as JSON', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'swagger-v2.json'));
      const createPet = result.collection.requests.find(r => r.operationId === 'createPet')!;

      expect(createPet.bodyType).toBe('json');
      expect(createPet.body).toBeTruthy();
      const body = JSON.parse(createPet.body!);
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('species');
    });

    it('extracts basic auth', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'swagger-v2.json'));
      const listUsers = result.collection.requests.find(r => r.operationId === 'listUsers')!;

      expect(listUsers.auth).toEqual({
        type: 'basic',
        basic: { username: '', password: '' },
      });
    });

    it('converts path parameters to {{placeholders}}', async () => {
      const result = await importOpenApiSpec(path.join(FIXTURES, 'swagger-v2.json'));
      const getPet = result.collection.requests.find(r => r.operationId === 'getPet')!;

      expect(getPet.url).toBe('{{baseUrl}}/pets/{{petId}}');
    });
  });

  describe('error handling', () => {
    it('throws for non-existent file', async () => {
      await expect(
        importOpenApiSpec('/nonexistent/path/spec.json'),
      ).rejects.toThrow();
    });

    it('throws for invalid spec content', async () => {
      // Create a temp invalid file
      const fs = await import('fs');
      const os = await import('os');
      const tmpFile = path.join(os.tmpdir(), `invalid-spec-${Date.now()}.json`);
      fs.writeFileSync(tmpFile, '{"not": "a valid spec"}');

      try {
        await expect(importOpenApiSpec(tmpFile)).rejects.toThrow();
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });
  });
});
