import { create } from 'zustand';
import { AuthConfig, SavedRequest, Folder, Collection } from '../../types';
import * as actions from './actions';

interface CollectionsState {
  collections: Collection[];
  activeCollectionId: string | null;
  activeRequestId: string | null;
  loading: boolean;
  
  // Actions
  setCollections: (collections: Collection[]) => void;
  setActiveCollection: (id: string | null) => void;
  setActiveRequest: (id: string | null) => void;
  loadCollections: () => Promise<void>;
  createCollection: (data: { name: string; description?: string }) => Promise<Collection>;
  addFolder: (collectionId: string, name: string, parentId?: string) => Promise<void>;
  createRequest: (collectionId: string, data: {
    name: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    auth?: AuthConfig;
    folderId?: string;
  }) => Promise<SavedRequest>;
  saveRequest: (collectionId: string, data: {
    name: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    auth?: AuthConfig;
    folderId?: string;
  }) => Promise<SavedRequest>;
  deleteCollection: (id: string) => Promise<void>;
  deleteFolder: (collectionId: string, folderId: string) => Promise<void>;
  deleteRequest: (collectionId: string, requestId: string) => Promise<void>;
  updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>;
  updateRequest: (collectionId: string, requestId: string, updates: Partial<SavedRequest>) => Promise<void>;
  updateFolder: (collectionId: string, folderId: string, updates: Partial<Folder>) => Promise<void>;
  moveRequest: (sourceCollectionId: string, requestId: string, targetCollectionId: string, targetFolderId?: string, targetOrder?: number) => Promise<void>;
  moveFolder: (sourceCollectionId: string, folderId: string, targetCollectionId: string, targetParentId?: string) => Promise<void>;
}

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
  
  updateCollection: (id, updates) => actions.updateCollection(set, id, updates),
  
  updateRequest: (collectionId, requestId, updates) => actions.updateRequest(set, collectionId, requestId, updates),

  updateFolder: (collectionId, folderId, updates) => actions.updateFolder(set, collectionId, folderId, updates),

  moveRequest: (sourceCollectionId, requestId, targetCollectionId, targetFolderId, targetOrder) => 
    actions.moveRequest(set, sourceCollectionId, requestId, targetCollectionId, targetFolderId, targetOrder),

  moveFolder: (sourceCollectionId, folderId, targetCollectionId, targetParentId) => 
    actions.moveFolder(set, sourceCollectionId, folderId, targetCollectionId, targetParentId),
}));
