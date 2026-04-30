import path from 'path';
import { Collection, Folder, SavedRequest } from '../models/collection';
import { BaseRepository } from './base.repository';

/** Check if an object has meaningful changes (ignoring timestamps). */
function hasChanged(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return a !== b;
}

export class CollectionRepository extends BaseRepository {
  constructor(private readonly getDataDir: () => string) {
    super();
  }

  private getFilePath(): string {
    return path.join(this.getDataDir(), 'collections.json');
  }

  private readAll(): Collection[] {
    return this.readJson<Collection[]>(this.getFilePath(), []);
  }

  private writeAll(collections: Collection[]): void {
    this.writeJson(this.getFilePath(), collections);
  }

  async getAll(): Promise<Collection[]> {
    return this.readAll();
  }

  async getById(id: string): Promise<Collection | undefined> {
    const collections = this.readAll();
    return collections.find(c => c.id === id);
  }

  async create(collection: Collection): Promise<Collection> {
    const collections = this.readAll();
    collections.push(collection);
    this.writeAll(collections);
    return collection;
  }

  async update(id: string, updates: Partial<Collection>): Promise<Collection | null> {
    const collections = this.readAll();
    const index = collections.findIndex(c => c.id === id);
    if (index === -1) return null;

    const current = collections[index];
    const merged = { ...current, ...updates };
    if (!hasChanged(current as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>)) {
      return current;
    }

    collections[index] = { ...merged };
    this.writeAll(collections);
    return collections[index];
  }

  async delete(id: string): Promise<boolean> {
    const collections = this.readAll();
    const filtered = collections.filter(c => c.id !== id);
    if (filtered.length === collections.length) return false;
    this.writeAll(filtered);
    return true;
  }

  // ── Request operations ───────────────────────────────────────────────────

  async addRequest(collectionId: string, request: SavedRequest): Promise<SavedRequest | null> {
    const collections = this.readAll();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return null;

    collection.requests.push(request);
    this.writeAll(collections);
    return request;
  }

  async updateRequest(
    collectionId: string,
    requestId: string,
    updates: Partial<SavedRequest>
  ): Promise<SavedRequest | null> {
    const collections = this.readAll();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return null;

    const index = collection.requests.findIndex(r => r.id === requestId);
    if (index === -1) return null;

    const current = collection.requests[index];
    const merged = { ...current, ...updates };
    if (!hasChanged(current as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>)) {
      return current;
    }

    collection.requests[index] = { ...merged };
    this.writeAll(collections);
    return collection.requests[index];
  }

  async deleteRequest(collectionId: string, requestId: string): Promise<boolean> {
    const collections = this.readAll();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return false;

    const initial = collection.requests.length;
    collection.requests = collection.requests.filter(r => r.id !== requestId);
    if (collection.requests.length === initial) return false;

    this.writeAll(collections);
    return true;
  }

  // ── Folder operations ────────────────────────────────────────────────────

  async addFolder(collectionId: string, folder: Folder): Promise<Folder | null> {
    const collections = this.readAll();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return null;

    if (!collection.folders) collection.folders = [];
    collection.folders.push(folder);

    this.writeAll(collections);
    return folder;
  }

  async updateFolder(collectionId: string, folderId: string, updates: Partial<Folder>): Promise<Folder | null> {
    const collections = this.readAll();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection?.folders) return null;

    const index = collection.folders.findIndex(f => f.id === folderId);
    if (index === -1) return null;

    const current = collection.folders[index];
    const merged = { ...current, ...updates };
    if (!hasChanged(current as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>)) {
      return current;
    }

    collection.folders[index] = { ...merged };
    this.writeAll(collections);
    return collection.folders[index];
  }

  async deleteFolder(collectionId: string, folderId: string): Promise<boolean> {
    const collections = this.readAll();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection?.folders) return false;

    // Recursively remove child folders before removing the parent
    const deleteChildren = (parentId: string) => {
      const children = collection.folders.filter(f => f.parentId === parentId);
      for (const child of children) {
        deleteChildren(child.id);
        collection.folders = collection.folders.filter(f => f.id !== child.id);
      }
    };
    deleteChildren(folderId);

    // Remove requests that belong directly to this folder
    collection.requests = collection.requests.filter(r => r.folderId !== folderId);

    const initial = collection.folders.length;
    collection.folders = collection.folders.filter(f => f.id !== folderId);
    if (collection.folders.length === initial) return false;

    this.writeAll(collections);
    return true;
  }

  /** Persist a pre-built collection array (used for bulk move/reorder operations). */
  async saveAll(collections: Collection[]): Promise<void> {
    this.writeAll(collections);
  }
}
