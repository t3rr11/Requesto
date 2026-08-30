import { beforeEach, describe, it, expect, vi } from 'vitest';
import { OpenApiService } from '../../services/openapi.service';
import type { CollectionService } from '../../services/collection.service';
import type { EnvironmentService } from '../../services/environment.service';
import type { Collection, ParsedSpecResult } from '../../models/collection';
import type { EnvironmentsData } from '../../models/environment';

vi.mock('../../utils/openapi/parser', () => ({
  importOpenApiSpec: vi.fn(),
  buildSyncPreview: vi.fn(),
  applySyncToCollection: vi.fn(),
}));

import { importOpenApiSpec } from '../../utils/openapi/parser';

const mockedImport = vi.mocked(importOpenApiSpec);

function makeParsedResult(overrides: Partial<ParsedSpecResult> = {}): ParsedSpecResult {
  return {
    collection: {
      id: 'parsed',
      name: 'Pet Store',
      folders: [],
      requests: [],
    },
    environments: [
      { key: 'baseUrl', value: 'https://api.example.com/v1', enabled: true },
    ],
    specHash: 'hash-1',
    ...overrides,
  };
}

function makeSavedCollection(name: string): Collection {
  return {
    id: 'col-1',
    name,
    folders: [],
    requests: [],
  };
}

function mockCollectionService(name: string): CollectionService {
  return {
    create: vi.fn().mockResolvedValue(makeSavedCollection(name)),
    saveAll: vi.fn().mockResolvedValue(undefined),
  } as unknown as CollectionService;
}

function mockEnvironmentService(data: EnvironmentsData): EnvironmentService {
  return {
    getAll: vi.fn().mockReturnValue(data),
    save: vi.fn(),
    setActive: vi.fn(),
  } as unknown as EnvironmentService;
}

describe('OpenApiService.importSpec', () => {
  beforeEach(() => {
    mockedImport.mockReset();
  });

  it('persists the spec baseUrl variables as an environment', async () => {
    mockedImport.mockResolvedValue(makeParsedResult());
    const collectionService = mockCollectionService('Pet Store');
    const environmentService = mockEnvironmentService({
      activeEnvironmentId: 'env-existing',
      environments: [{ id: 'env-existing', name: 'Dev', variables: [] }],
    });
    const service = new OpenApiService(collectionService, environmentService);

    await service.importSpec('/path/to/spec.yaml');

    expect(environmentService.save).toHaveBeenCalledTimes(1);
    const saved = (environmentService.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(saved.name).toBe('Pet Store Base URLs');
    expect(saved.variables).toEqual([
      { key: 'baseUrl', value: 'https://api.example.com/v1', enabled: true },
    ]);
    // An existing active environment is never hijacked
    expect(environmentService.setActive).not.toHaveBeenCalled();
  });

  it('activates the created environment when nothing else is active', async () => {
    mockedImport.mockResolvedValue(makeParsedResult());
    const environmentService = mockEnvironmentService({
      activeEnvironmentId: null,
      environments: [],
    });
    const service = new OpenApiService(mockCollectionService('Pet Store'), environmentService);

    await service.importSpec('/path/to/spec.yaml');

    const saved = (environmentService.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(environmentService.setActive).toHaveBeenCalledWith(saved.id);
  });

  it('deduplicates environment names for repeated imports', async () => {
    mockedImport.mockResolvedValue(makeParsedResult());
    const environmentService = mockEnvironmentService({
      activeEnvironmentId: 'env-existing',
      environments: [
        { id: 'env-existing', name: 'Dev', variables: [] },
        { id: 'env-2', name: 'Pet Store Base URLs', variables: [] },
        { id: 'env-3', name: 'Pet Store Base URLs (2)', variables: [] },
      ],
    });
    const service = new OpenApiService(mockCollectionService('Pet Store'), environmentService);

    await service.importSpec('/path/to/spec.yaml');

    const saved = (environmentService.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(saved.name).toBe('Pet Store Base URLs (3)');
  });

  it('does not create an environment when the spec has no servers', async () => {
    mockedImport.mockResolvedValue(makeParsedResult({ environments: [] }));
    const environmentService = mockEnvironmentService({
      activeEnvironmentId: null,
      environments: [],
    });
    const service = new OpenApiService(mockCollectionService('Pet Store'), environmentService);

    await service.importSpec('/path/to/spec.yaml');

    expect(environmentService.save).not.toHaveBeenCalled();
    expect(environmentService.setActive).not.toHaveBeenCalled();
  });
});
