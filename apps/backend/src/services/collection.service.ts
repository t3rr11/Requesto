import { CollectionRepository } from '../repositories/collection.repository';
import { AppError } from '../errors/app-error';
import type { Collection, SavedRequest, Folder } from '../models/collection';
import { UNCATEGORIZED_COLLECTION_ID } from '../models/collection';
import type { AuthConfig, BodyType, FormDataEntry } from '../models/proxy';

export interface MoveRequestParams {
  sourceCollectionId: string;
  requestId: string;
  targetCollectionId: string;
  targetFolderId?: string;
  targetOrder?: number;
}

export interface MoveFolderParams {
  sourceCollectionId: string;
  folderId: string;
  targetCollectionId: string;
  targetParentId?: string;
}

export class CollectionService {
  constructor(private readonly repo: CollectionRepository) {}

  /**
   * Idempotently ensure the system-managed "Uncategorized" collection exists.
   * Used as a catch-all when users save a request without picking a collection.
   */
  async ensureUncategorizedCollection(): Promise<Collection> {
    const existing = await this.repo.getById(UNCATEGORIZED_COLLECTION_ID);
    if (existing) return existing;

    const collection: Collection = {
      id: UNCATEGORIZED_COLLECTION_ID,
      name: 'Uncategorized',
      description: 'Saved requests that do not belong to a specific collection.',
      isSystem: true,
      folders: [],
      requests: []
    };
    return this.repo.create(collection);
  }

  async getAll(): Promise<Collection[]> {
    return this.repo.getAll();
  }

  async getById(id: string): Promise<Collection> {
    const collection = await this.repo.getById(id);
    if (!collection) {
      throw AppError.notFound('Collection not found');
    }
    return collection;
  }

  async create(name: string, description?: string): Promise<Collection> {
    const newCollection: Collection = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: name.trim(),
      description,
      folders: [],
      requests: []
    };
    return this.repo.create(newCollection);
  }

  async update(id: string, updates: Partial<Pick<Collection, 'name' | 'description'>>): Promise<Collection> {
    if (id === UNCATEGORIZED_COLLECTION_ID) {
      throw AppError.badRequest('The Uncategorized collection cannot be renamed.');
    }
    const collection = await this.repo.update(id, updates);
    if (!collection) {
      throw AppError.notFound('Collection not found');
    }
    return collection;
  }

  async delete(id: string): Promise<void> {
    if (id === UNCATEGORIZED_COLLECTION_ID) {
      throw AppError.badRequest('The Uncategorized collection cannot be deleted.');
    }
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw AppError.notFound('Collection not found');
    }
  }

  async addRequest(
    collectionId: string,
    data: {
      name: string;
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: string;
      bodyType?: BodyType;
      formDataEntries?: FormDataEntry[];
      auth?: AuthConfig;
      folderId?: string;
    },
  ): Promise<SavedRequest> {
    if (collectionId === UNCATEGORIZED_COLLECTION_ID) {
      await this.ensureUncategorizedCollection();
    }

    const newRequest: SavedRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: data.name.trim(),
      method: data.method.toUpperCase(),
      url: data.url.trim(),
      headers: data.headers,
      body: data.body,
      bodyType: data.bodyType,
      formDataEntries: data.formDataEntries,
      auth: data.auth,
      folderId: data.folderId,
      collectionId
    };

    const saved = await this.repo.addRequest(collectionId, newRequest);
    if (!saved) {
      throw AppError.notFound('Collection not found');
    }
    return saved;
  }

  async updateRequest(
    collectionId: string,
    requestId: string,
    updates: Partial<Omit<SavedRequest, 'id' | 'collectionId'>>,
  ): Promise<SavedRequest> {
    const saved = await this.repo.updateRequest(collectionId, requestId, updates);
    if (!saved) {
      throw AppError.notFound('Collection or request not found');
    }
    return saved;
  }

  async deleteRequest(collectionId: string, requestId: string): Promise<void> {
    const deleted = await this.repo.deleteRequest(collectionId, requestId);
    if (!deleted) {
      throw AppError.notFound('Collection or request not found');
    }
  }

  async duplicateRequest(collectionId: string, requestId: string): Promise<SavedRequest> {
    const collection = await this.repo.getById(collectionId);
    if (!collection) {
      throw AppError.notFound('Collection not found');
    }
    const original = collection.requests.find((r) => r.id === requestId);
    if (!original) {
      throw AppError.notFound('Request not found');
    }
    const duplicate: SavedRequest = {
      ...original,
      id: `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: `${original.name} Copy`,
    };
    const saved = await this.repo.addRequest(collectionId, duplicate);
    if (!saved) {
      throw AppError.notFound('Collection not found');
    }
    return saved;
  }

  async addFolder(collectionId: string, data: { name: string; parentId?: string }): Promise<Folder> {
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: data.name.trim(),
      parentId: data.parentId,
      collectionId
    };

    const saved = await this.repo.addFolder(collectionId, newFolder);
    if (!saved) {
      throw AppError.notFound('Collection not found');
    }
    return saved;
  }

  async updateFolder(
    collectionId: string,
    folderId: string,
    updates: Partial<Pick<Folder, 'name' | 'parentId'>>,
  ): Promise<Folder> {
    const saved = await this.repo.updateFolder(collectionId, folderId, updates);
    if (!saved) {
      throw AppError.notFound('Collection or folder not found');
    }
    return saved;
  }

  async deleteFolder(collectionId: string, folderId: string): Promise<void> {
    const deleted = await this.repo.deleteFolder(collectionId, folderId);
    if (!deleted) {
      throw AppError.notFound('Collection or folder not found');
    }
  }

  async moveRequest(params: MoveRequestParams): Promise<SavedRequest> {
    const { sourceCollectionId, requestId, targetCollectionId, targetFolderId, targetOrder } = params;

    const sourceCollection = await this.repo.getById(sourceCollectionId);
    if (!sourceCollection) {
      throw AppError.notFound('Source collection not found');
    }

    const requestToMove = sourceCollection.requests.find((r) => r.id === requestId);
    if (!requestToMove) {
      throw AppError.notFound('Request not found');
    }

    await this.repo.deleteRequest(sourceCollectionId, requestId);

    const targetCollection = await this.repo.getById(targetCollectionId);
    if (!targetCollection) {
      throw AppError.notFound('Target collection not found');
    }

    let order = targetOrder;
    if (order === undefined) {
      const targetRequests = targetCollection.requests.filter((r) => r.folderId === targetFolderId);
      order = targetRequests.length > 0 ? Math.max(...targetRequests.map((r) => r.order || 0)) + 1 : 0;
    } else {
      const targetRequests = targetCollection.requests.filter((r) => r.folderId === targetFolderId);
      for (const req of targetRequests) {
        if ((req.order || 0) >= order) {
          await this.repo.updateRequest(targetCollectionId, req.id, { order: (req.order || 0) + 1 });
        }
      }
    }

    const movedRequest: SavedRequest = {
      ...requestToMove,
      collectionId: targetCollectionId,
      folderId: targetFolderId,
      order
    };

    const saved = await this.repo.addRequest(targetCollectionId, movedRequest);
    if (!saved) {
      throw AppError.notFound('Target collection not found');
    }
    return saved;
  }

  async moveFolder(params: MoveFolderParams): Promise<Folder> {
    const { sourceCollectionId, folderId, targetCollectionId, targetParentId } = params;

    const sourceCollection = await this.repo.getById(sourceCollectionId);
    if (!sourceCollection) {
      throw AppError.notFound('Source collection not found');
    }

    const folderToMove = sourceCollection.folders?.find((f) => f.id === folderId);
    if (!folderToMove) {
      throw AppError.notFound('Folder not found');
    }

    if (targetParentId) {
      let checkParent = sourceCollection.folders?.find((f) => f.id === targetParentId);
      while (checkParent) {
        if (checkParent.id === folderId) {
          throw AppError.badRequest('Cannot move a folder into itself or its descendants');
        }
        checkParent = sourceCollection.folders?.find((f) => f.id === checkParent?.parentId);
      }
    }

    const getDescendantIds = (parentId: string): string[] => {
      const children = sourceCollection.folders?.filter((f) => f.parentId === parentId) || [];
      return children.flatMap((child) => [child.id, ...getDescendantIds(child.id)]);
    };
    const descendantIds = [folderId, ...getDescendantIds(folderId)];

    const requestsToMove = sourceCollection.requests.filter(
      (r) => r.folderId && descendantIds.includes(r.folderId),
    );

    await this.repo.deleteFolder(sourceCollectionId, folderId);

    const foldersToMove = [
      folderToMove,
      ...(sourceCollection.folders?.filter((f) => descendantIds.slice(1).includes(f.id)) || []),
    ];

    const movedFolder: Folder = {
      ...folderToMove,
      parentId: targetParentId,
      collectionId: targetCollectionId
    };

    const targetCollection = await this.repo.getById(targetCollectionId);
    if (!targetCollection) {
      throw AppError.notFound('Target collection not found');
    }

    const allFolders = targetCollection.folders || [];
    const allRequests = [...targetCollection.requests];

    for (const folder of foldersToMove) {
      const isRoot = folder.id === folderId;
      allFolders.push({
        ...folder,
        parentId: isRoot ? targetParentId : folder.parentId,
        collectionId: targetCollectionId
      });
    }

    for (const req of requestsToMove) {
      allRequests.push({
        ...req,
        collectionId: targetCollectionId
      });
    }

    const updatedTarget: Collection = { ...targetCollection, folders: allFolders, requests: allRequests };
    await this.saveAll(updatedTarget);
    return movedFolder;
  }

  async importCollection(raw: unknown): Promise<Collection> {
    const col = raw as { name?: string; description?: string; folders?: Folder[]; requests?: SavedRequest[] };
    if (!col || !col.name) throw AppError.badRequest('Invalid collection format');

    const newCollectionId = `col-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Remap folder IDs so imported IDs don't conflict with existing ones
    const folderIdMap = new Map<string, string>();
    const folders: Folder[] = (col.folders ?? []).map(f => {
      const newId = `folder-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      folderIdMap.set(f.id, newId);
      return { ...f, id: newId, collectionId: newCollectionId };
    });
    // Fix parentId references after the full map is built
    for (const f of folders) {
      if (f.parentId) {
        f.parentId = folderIdMap.get(f.parentId) ?? f.parentId;
      }
    }

    // Remap request IDs
    const requests: SavedRequest[] = (col.requests ?? []).map(r => ({
      ...r,
      id: `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      collectionId: newCollectionId,
      folderId: r.folderId ? (folderIdMap.get(r.folderId) ?? r.folderId) : undefined,
    }));

    const collection: Collection = {
      id: newCollectionId,
      name: col.name.trim(),
      description: col.description,
      folders,
      requests,
    };

    return this.repo.create(collection);
  }

  async saveAll(collection: Collection): Promise<void> {
    const all = await this.repo.getAll();
    const idx = all.findIndex((c) => c.id === collection.id);
    if (idx >= 0) {
      all[idx] = collection;
    } else {
      all.push(collection);
    }
    await this.repo.saveAll(all);
  }
}
