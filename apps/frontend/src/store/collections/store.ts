import { create } from 'zustand';
import type { Collection, SavedRequest, Folder, SyncPreviewResult, SyncApplyBody } from './types';
import type { AuthConfig, BodyType, FormDataEntry } from '../request/types';
import * as actions from './actions';

type CollectionsState = {
  collections: Collection[];
  activeCollectionId: string | null;
  activeRequestId: string | null;
  loading: boolean;

  setCollections: (collections: Collection[]) => void;
  setActiveCollection: (id: string | null) => void;
  setActiveRequest: (id: string | null) => void;
  loadCollections: () => Promise<void>;
  createCollection: (data: { name: string; description?: string }) => Promise<Collection>;
  addFolder: (collectionId: string, name: string, parentId?: string) => Promise<void>;
  createRequest: (collectionId: string, data: {
    name: string; method: string; url: string;
    headers?: Record<string, string>; body?: string;
    bodyType?: BodyType; formDataEntries?: FormDataEntry[];
    auth?: AuthConfig; folderId?: string;
  }) => Promise<SavedRequest>;
  saveRequest: (collectionId: string, data: {
    name: string; method: string; url: string;
    headers?: Record<string, string>; body?: string;
    bodyType?: BodyType; formDataEntries?: FormDataEntry[];
    auth?: AuthConfig; folderId?: string;
  }) => Promise<SavedRequest>;
  deleteCollection: (id: string) => Promise<void>;
  deleteFolder: (collectionId: string, folderId: string) => Promise<void>;
  deleteRequest: (collectionId: string, requestId: string) => Promise<void>;
  deleteRequests: (requests: Array<{ collectionId: string; requestId: string }>) => Promise<void>;
  duplicateRequest: (collectionId: string, requestId: string) => Promise<void>;
  duplicateRequests: (requests: Array<{ collectionId: string; requestId: string }>) => Promise<void>;
  duplicateCollection: (id: string) => Promise<void>;
  updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>;
  updateRequest: (collectionId: string, requestId: string, updates: Partial<SavedRequest>) => Promise<void>;
  updateFolder: (collectionId: string, folderId: string, updates: Partial<Folder>) => Promise<void>;
  moveRequest: (sourceCollectionId: string, requestId: string, targetCollectionId: string, targetFolderId?: string, targetOrder?: number) => Promise<void>;
  moveRequests: (requests: Array<{ sourceCollectionId: string; requestId: string }>, targetCollectionId: string, targetFolderId?: string, baseOrder?: number) => Promise<void>;
  moveFolder: (sourceCollectionId: string, folderId: string, targetCollectionId: string, targetParentId?: string) => Promise<void>;
  moveCollection: (id: string, targetOrder: number) => Promise<void>;
  importCollection: (file: File) => Promise<Collection>;
  importOpenApiCollection: (data: { source: string; name?: string; linkSpec?: boolean }) => Promise<Collection>;
  exportCollection: (collectionId: string) => Promise<void>;
  exportRequest: (collectionId: string, requestId: string) => Promise<void>;
  exportFolder: (collectionId: string, folderId: string) => Promise<void>;
  syncPreview: (collectionId: string) => Promise<SyncPreviewResult & { noChanges?: boolean }>;
  syncApply: (collectionId: string, body: SyncApplyBody) => Promise<void>;
  unlinkSpec: (collectionId: string) => Promise<void>;
};

export const useCollectionsStore = create<CollectionsState>((set) => ({
  collections: [],
  activeCollectionId: null,
  activeRequestId: null,
  loading: false,

  setCollections: (collections) => set({ collections }),
  setActiveCollection: (id) => set({ activeCollectionId: id }),
  setActiveRequest: (id) => set({ activeRequestId: id }),

  loadCollections: () => actions.loadCollections(set),
  createCollection: (data) => actions.createCollection(set, data),
  addFolder: (collectionId, name, parentId) => actions.addFolder(set, collectionId, name, parentId),
  createRequest: (collectionId, data) => actions.createRequest(set, collectionId, data),
  saveRequest: (collectionId, data) => actions.saveRequest(set, collectionId, data),
  deleteCollection: (id) => actions.deleteCollection(set, id),
  deleteFolder: (collectionId, folderId) => actions.deleteFolder(set, collectionId, folderId),
  deleteRequest: (collectionId, requestId) => actions.deleteRequest(set, collectionId, requestId),
  deleteRequests: (requests) => actions.deleteRequests(set, requests),
  duplicateRequest: (collectionId, requestId) => actions.duplicateRequest(set, collectionId, requestId),
  duplicateRequests: (requests) => actions.duplicateRequests(set, requests),
  duplicateCollection: (id) => actions.duplicateCollection(set, id),
  updateCollection: (id, updates) => actions.updateCollection(set, id, updates),
  updateRequest: (collectionId, requestId, updates) =>
    actions.updateRequest(set, collectionId, requestId, updates),
  updateFolder: (collectionId, folderId, updates) =>
    actions.updateFolder(set, collectionId, folderId, updates),
  moveRequest: (sourceCollectionId, requestId, targetCollectionId, targetFolderId, targetOrder) =>
    actions.moveRequest(set, sourceCollectionId, requestId, targetCollectionId, targetFolderId, targetOrder),
  moveRequests: (requests, targetCollectionId, targetFolderId, baseOrder) =>
    actions.moveRequests(set, requests, targetCollectionId, targetFolderId, baseOrder),
  moveFolder: (sourceCollectionId, folderId, targetCollectionId, targetParentId) =>
    actions.moveFolder(set, sourceCollectionId, folderId, targetCollectionId, targetParentId),
  moveCollection: (id, targetOrder) => actions.moveCollection(set, id, targetOrder),
  importCollection: (file) => actions.importCollection(set, file),
  importOpenApiCollection: (data) => actions.importOpenApiCollection(set, data),
  exportCollection: (collectionId) => actions.exportCollection(collectionId),
  exportRequest: (collectionId, requestId) => actions.exportRequest(collectionId, requestId),
  exportFolder: (collectionId, folderId) => actions.exportFolder(collectionId, folderId),
  syncPreview: (collectionId) => actions.syncPreview(collectionId),
  syncApply: (collectionId, body) => actions.syncApply(set, collectionId, body),
  unlinkSpec: (collectionId) => actions.unlinkSpec(set, collectionId),
}));
