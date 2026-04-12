import fs from 'fs';
import path from 'path';
import { AuthConfig, FormDataEntry } from '../types';
import { initializeFile, atomicWrite } from './storage';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const COLLECTIONS_FILE = path.join(DATA_DIR, 'collections.json');

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: string;
  formDataEntries?: FormDataEntry[];
  auth?: AuthConfig;
  collectionId: string;
  folderId?: string;
  order?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  collectionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  folders: Folder[];
  requests: SavedRequest[];
  createdAt: number;
  updatedAt: number;
}

initializeFile(COLLECTIONS_FILE, []);

function readCollections(): Collection[] {
  try {
    const data = fs.readFileSync(COLLECTIONS_FILE, 'utf-8');
    return JSON.parse(data) as Collection[];
  } catch (error) {
    console.error('Error reading collections:', error);
    return [];
  }
}

function writeCollections(collections: Collection[]): void {
  atomicWrite(COLLECTIONS_FILE, collections);
}

export const collectionsDb = {
  getAll: async (): Promise<Collection[]> => {
    return readCollections();
  },

  getById: async (id: string): Promise<Collection | undefined> => {
    const collections = readCollections();
    return collections.find((c: Collection) => c.id === id);
  },

  create: async (collection: Collection): Promise<Collection> => {
    const collections = readCollections();
    collections.push(collection);
    writeCollections(collections);
    return collection;
  },

  update: async (id: string, updates: Partial<Collection>): Promise<Collection | null> => {
    const collections = readCollections();
    const index = collections.findIndex((c: Collection) => c.id === id);
    if (index === -1) return null;

    collections[index] = { ...collections[index], ...updates, updatedAt: Date.now() };
    writeCollections(collections);
    return collections[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const collections = readCollections();
    const filtered = collections.filter((c: Collection) => c.id !== id);
    if (filtered.length === collections.length) return false;
    
    writeCollections(filtered);
    return true;
  },

  addRequest: async (collectionId: string, request: SavedRequest): Promise<SavedRequest | null> => {
    const collections = readCollections();
    const collection = collections.find((c: Collection) => c.id === collectionId);
    if (!collection) return null;

    collection.requests.push(request);
    collection.updatedAt = Date.now();
    writeCollections(collections);
    return request;
  },

  updateRequest: async (
    collectionId: string,
    requestId: string,
    updates: Partial<SavedRequest>
  ): Promise<SavedRequest | null> => {
    const collections = readCollections();
    const collection = collections.find((c: Collection) => c.id === collectionId);
    if (!collection) return null;

    const requestIndex = collection.requests.findIndex((r: SavedRequest) => r.id === requestId);
    if (requestIndex === -1) return null;

    collection.requests[requestIndex] = {
      ...collection.requests[requestIndex],
      ...updates,
      updatedAt: Date.now(),
    };
    collection.updatedAt = Date.now();
    writeCollections(collections);
    return collection.requests[requestIndex];
  },

  deleteRequest: async (collectionId: string, requestId: string): Promise<boolean> => {
    const collections = readCollections();
    const collection = collections.find((c: Collection) => c.id === collectionId);
    if (!collection) return false;

    const initialLength = collection.requests.length;
    collection.requests = collection.requests.filter((r: SavedRequest) => r.id !== requestId);
    
    if (collection.requests.length === initialLength) return false;

    collection.updatedAt = Date.now();
    writeCollections(collections);
    return true;
  },

  // Folder operations
  addFolder: async (collectionId: string, folder: Folder): Promise<Folder | null> => {
    const collections = readCollections();
    const collection = collections.find((c: Collection) => c.id === collectionId);
    if (!collection) return null;

    if (!collection.folders) collection.folders = [];
    collection.folders.push(folder);
    collection.updatedAt = Date.now();
    writeCollections(collections);
    return folder;
  },

  updateFolder: async (
    collectionId: string,
    folderId: string,
    updates: Partial<Folder>
  ): Promise<Folder | null> => {
    const collections = readCollections();
    const collection = collections.find((c: Collection) => c.id === collectionId);
    if (!collection || !collection.folders) return null;

    const folderIndex = collection.folders.findIndex((f: Folder) => f.id === folderId);
    if (folderIndex === -1) return null;

    collection.folders[folderIndex] = {
      ...collection.folders[folderIndex],
      ...updates,
      updatedAt: Date.now(),
    };
    collection.updatedAt = Date.now();
    writeCollections(collections);
    return collection.folders[folderIndex];
  },

  deleteFolder: async (collectionId: string, folderId: string): Promise<boolean> => {
    const collections = readCollections();
    const collection = collections.find((c: Collection) => c.id === collectionId);
    if (!collection || !collection.folders) return false;

    // EXPLAIN: Recursively delete all child folders before deleting parent
    const deleteChildFolders = (parentId: string) => {
      const childFolders = collection.folders.filter((f: Folder) => f.parentId === parentId);
      childFolders.forEach((childFolder: Folder) => {
        deleteChildFolders(childFolder.id);
        collection.folders = collection.folders.filter((f: Folder) => f.id !== childFolder.id);
      });
    };

    deleteChildFolders(folderId);
    collection.requests = collection.requests.filter((r: SavedRequest) => r.folderId !== folderId);

    // Delete the folder itself
    const initialLength = collection.folders.length;
    collection.folders = collection.folders.filter((f: Folder) => f.id !== folderId);
    
    if (collection.folders.length === initialLength) return false;

    collection.updatedAt = Date.now();
    writeCollections(collections);
    return true;
  },
};
