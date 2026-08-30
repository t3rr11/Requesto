import { randomUUID } from 'node:crypto';
import { importOpenApiSpec } from '../utils/openapi/parser';
import { buildSyncPreview, applySyncToCollection } from '../utils/openapi/reconcile';
import type { SyncApplyBody } from '../models/openapi-sync';
import { CollectionService } from './collection.service';
import { EnvironmentService } from './environment.service';
import { AppError } from '../errors/app-error';
import type { Collection, OpenApiEnvironmentVariable } from '../models/collection';
import type { ParsedSpecResult } from '../models/collection';
import type { Environment, EnvironmentVariable } from '../models/environment';

export class OpenApiService {
  constructor(
    private readonly collectionService: CollectionService,
    private readonly environmentService?: EnvironmentService,
  ) {}

  async importSpec(
    source: string,
    options?: { name?: string; linkSpec?: boolean },
  ): Promise<{ collection: Collection; environments: ParsedSpecResult['environments'] }> {
    const result = await importOpenApiSpec(source.trim(), {
      name: options?.name?.trim(),
      linkSpec: options?.linkSpec,
    });

    const savedCollection = await this.collectionService.create(
      result.collection.name,
      result.collection.description,
    );

    // Merge spec data from parser into the saved collection shell
    const merged: Collection = {
      ...savedCollection,
      folders: result.collection.folders,
      requests: result.collection.requests,
      openApiSpec: result.collection.openApiSpec,
    };

    await this.collectionService.saveAll(merged);

    this.persistSpecEnvironments(result.environments, savedCollection.name);

    return { collection: merged, environments: result.environments };
  }

  /**
   * Persist the baseUrl variables extracted from the spec as a real environment so
   * `{{baseUrl}}` resolves out of the box. Activated only when no environment is
   * active yet, so existing setups are never hijacked.
   */
  private persistSpecEnvironments(
    variables: OpenApiEnvironmentVariable[],
    collectionName: string,
  ): void {
    if (!this.environmentService || variables.length === 0) return;

    const data = this.environmentService.getAll();
    let name = `${collectionName} Base URLs`;
    let suffix = 2;
    while (data.environments.some((e) => e.name === name)) {
      name = `${collectionName} Base URLs (${suffix++})`;
    }

    const envVariables: EnvironmentVariable[] = variables.map(
      ({ key, value, enabled }) => ({ key, value, enabled }),
    );
    const environment: Environment = {
      id: `env-${randomUUID()}`,
      name,
      variables: envVariables,
    };
    this.environmentService.save(environment);

    if (!data.activeEnvironmentId) {
      this.environmentService.setActive(environment.id);
    }
  }

  async previewSync(collectionId: string): Promise<ReturnType<typeof buildSyncPreview> & { noChanges?: boolean; specHash?: string }> {
    const collection = await this.collectionService.getById(collectionId);
    if (!collection.openApiSpec) {
      throw AppError.badRequest('Collection is not linked to an OpenAPI spec');
    }

    const result = await importOpenApiSpec(collection.openApiSpec.source, {
      name: collection.name,
      linkSpec: true,
    });

    const preview = buildSyncPreview(collection, result.collection, result.specHash);

    if (preview.added.length === 0 && preview.updated.length === 0 && preview.orphaned.length === 0) {
      return { ...preview, noChanges: true, specHash: result.specHash };
    }

    return preview;
  }

  async applySync(collectionId: string, body: SyncApplyBody): Promise<Collection> {
    const collection = await this.collectionService.getById(collectionId);
    if (!collection.openApiSpec) {
      throw AppError.badRequest('Collection is not linked to an OpenAPI spec');
    }

    const result = await importOpenApiSpec(collection.openApiSpec.source, {
      name: collection.name,
      linkSpec: true,
    });

    const preview = buildSyncPreview(collection, result.collection, result.specHash);
    const updated = applySyncToCollection(collection, preview, body);
    await this.collectionService.saveAll(updated);
    return updated;
  }

  async unlinkSpec(collectionId: string): Promise<Collection> {
    const collection = await this.collectionService.getById(collectionId);
    const { openApiSpec: _, ...rest } = collection;
    const updated: Collection = { ...rest, openApiSpec: undefined };
    await this.collectionService.saveAll(updated);
    return updated;
  }
}
