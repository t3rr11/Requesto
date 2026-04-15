import { importOpenApiSpec } from '../utils/openapi/parser';
import { buildSyncPreview, applySyncToCollection } from '../utils/openapi/reconcile';
import type { SyncApplyBody } from '../models/openapi-sync';
import { CollectionService } from './collection.service';
import { AppError } from '../errors/app-error';
import type { Collection } from '../models/collection';
import type { ParsedSpecResult } from '../models/collection';

export class OpenApiService {
  constructor(private readonly collectionService: CollectionService) {}

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

    return { collection: merged, environments: result.environments };
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
