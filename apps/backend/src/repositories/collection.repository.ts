import fs from 'node:fs';
import path from 'node:path';
import { Collection, Folder, SavedRequest } from '../models/collection';
import { BaseRepository } from './base.repository';
import { readOrderSection, removeIdFromOrder, writeOrderSection } from '../utils/order';
import { resolveUniqueFileName } from '../utils/slug';

/** Check if an object has meaningful changes (ignoring timestamps). */
function hasChanged(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return a !== b;
}

export class CollectionRepository extends BaseRepository {
  constructor(private readonly getDataDir: () => string) {
    super();
  }

  private getDir(): string {
    return path.join(this.getDataDir(), 'collections');
  }

  /** Read a single collection JSON file. Returns null for unreadable/invalid files. */
  private readCollectionFile(filePath: string): Collection | null {
    const parsed = this.readJson<Collection | null>(filePath, null);
    if (!parsed || typeof parsed.id !== 'string') return null;
    return parsed;
  }

  /** Find the file containing the collection with the given id. */
  private findFile(id: string): { fileName: string; collection: Collection } | null {
    const dir = this.getDir();
    if (!fs.existsSync(dir)) return null;
    for (const fileName of fs.readdirSync(dir)) {
      if (!fileName.endsWith('.json')) continue;
      const collection = this.readCollectionFile(path.join(dir, fileName));
      if (collection && collection.id === id) return { fileName, collection };
    }
    return null;
  }

  /**
   * Write a collection to its own file, renaming the file when the collection
   * name (and therefore its slug) changed.
   */
  private writeCollection(collection: Collection): void {
    const dir = this.getDir();
    this.ensureDir(dir);
    const existing = this.findFile(collection.id);
    const fileName = resolveUniqueFileName(dir, collection.name, collection.id);
    this.writeJson(path.join(dir, fileName), collection);
    if (existing && existing.fileName !== fileName) {
      fs.unlinkSync(path.join(dir, existing.fileName));
    }
  }

  private appendToOrder(id: string): void {
    const ids = readOrderSection(this.getDataDir(), 'collections');
    if (!ids.includes(id)) {
      writeOrderSection(this.getDataDir(), 'collections', [...ids, id]);
    }
  }

  async getAll(): Promise<Collection[]> {
    const dir = this.getDir();
    const byId = new Map<string, Collection>();
    if (fs.existsSync(dir)) {
      for (const fileName of fs.readdirSync(dir)) {
        if (!fileName.endsWith('.json')) continue;
        const collection = this.readCollectionFile(path.join(dir, fileName));
        if (collection && !byId.has(collection.id)) byId.set(collection.id, collection);
      }
    }

    const ordered: Collection[] = [];
    const seen = new Set<string>();
    for (const id of readOrderSection(this.getDataDir(), 'collections')) {
      const collection = byId.get(id);
      if (collection) {
        ordered.push(collection);
        seen.add(id);
      }
    }
    // Collections missing from the manifest (e.g. added by another tool) keep readdir order
    for (const [id, collection] of byId) {
      if (!seen.has(id)) ordered.push(collection);
    }
    return ordered;
  }

  async getById(id: string): Promise<Collection | undefined> {
    return this.findFile(id)?.collection;
  }

  async create(collection: Collection): Promise<Collection> {
    this.writeCollection(collection);
    this.appendToOrder(collection.id);
    return collection;
  }

  async update(id: string, updates: Partial<Collection>): Promise<Collection | null> {
    const found = this.findFile(id);
    if (!found) return null;

    const current = found.collection;
    const merged = { ...current, ...updates };
    if (!hasChanged(current as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>)) {
      return current;
    }

    this.writeCollection({ ...merged, id });
    return { ...merged, id };
  }

  async delete(id: string): Promise<boolean> {
    const found = this.findFile(id);
    if (!found) return false;
    fs.unlinkSync(path.join(this.getDir(), found.fileName));
    removeIdFromOrder(this.getDataDir(), id);
    return true;
  }

  // ── Request operations ───────────────────────────────────────────────────

  async addRequest(collectionId: string, request: SavedRequest): Promise<SavedRequest | null> {
    const found = this.findFile(collectionId);
    if (!found) return null;

    found.collection.requests.push(request);
    this.writeCollection(found.collection);
    return request;
  }

  async updateRequest(
    collectionId: string,
    requestId: string,
    updates: Partial<SavedRequest>
  ): Promise<SavedRequest | null> {
    const found = this.findFile(collectionId);
    if (!found) return null;

    const index = found.collection.requests.findIndex(r => r.id === requestId);
    if (index === -1) return null;

    const current = found.collection.requests[index];
    const merged = { ...current, ...updates };
    if (!hasChanged(current as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>)) {
      return current;
    }

    found.collection.requests[index] = { ...merged, id: requestId };
    this.writeCollection(found.collection);
    return found.collection.requests[index];
  }

  async deleteRequest(collectionId: string, requestId: string): Promise<boolean> {
    const found = this.findFile(collectionId);
    if (!found) return false;

    const initial = found.collection.requests.length;
    found.collection.requests = found.collection.requests.filter(r => r.id !== requestId);
    if (found.collection.requests.length === initial) return false;

    this.writeCollection(found.collection);
    return true;
  }

  // ── Folder operations ────────────────────────────────────────────────────

  async addFolder(collectionId: string, folder: Folder): Promise<Folder | null> {
    const found = this.findFile(collectionId);
    if (!found) return null;

    if (!found.collection.folders) found.collection.folders = [];
    found.collection.folders.push(folder);

    this.writeCollection(found.collection);
    return folder;
  }

  async updateFolder(collectionId: string, folderId: string, updates: Partial<Folder>): Promise<Folder | null> {
    const found = this.findFile(collectionId);
    if (!found?.collection.folders) return null;

    const index = found.collection.folders.findIndex(f => f.id === folderId);
    if (index === -1) return null;

    const current = found.collection.folders[index];
    const merged = { ...current, ...updates };
    if (!hasChanged(current as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>)) {
      return current;
    }

    found.collection.folders[index] = { ...merged, id: folderId };
    this.writeCollection(found.collection);
    return found.collection.folders[index];
  }

  async deleteFolder(collectionId: string, folderId: string): Promise<boolean> {
    const found = this.findFile(collectionId);
    if (!found?.collection.folders) return false;
    const collection = found.collection;

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

    this.writeCollection(collection);
    return true;
  }

  /**
   * Persist a pre-built collection array (used for bulk move/import operations).
   * Collections missing from the array are removed from disk.
   */
  async saveAll(collections: Collection[]): Promise<void> {
    const dir = this.getDir();
    const keepIds = new Set(collections.map(c => c.id));

    if (fs.existsSync(dir)) {
      for (const fileName of fs.readdirSync(dir)) {
        if (!fileName.endsWith('.json')) continue;
        const collection = this.readCollectionFile(path.join(dir, fileName));
        if (collection && !keepIds.has(collection.id)) {
          fs.unlinkSync(path.join(dir, fileName));
        }
      }
    }

    for (const collection of collections) {
      this.writeCollection(collection);
    }
    writeOrderSection(this.getDataDir(), 'collections', collections.map(c => c.id));
  }

  /** Persist a new collection ordering (drag-reorder) without rewriting collection files. */
  async reorder(ids: string[]): Promise<void> {
    writeOrderSection(this.getDataDir(), 'collections', ids);
  }
}
