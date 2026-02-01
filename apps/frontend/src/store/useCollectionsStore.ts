import { create } from 'zustand';
import { collectionsApi } from '../helpers/api/collections';
import { AuthConfig } from '../types';

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
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
  addFolder: (collectionId: string, name: string, parentId?: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  deleteFolder: (collectionId: string, folderId: string) => Promise<void>;
  deleteRequest: (collectionId: string, requestId: string) => Promise<void>;
  updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>;
  updateRequest: (collectionId: string, requestId: string, updates: Partial<SavedRequest>) => Promise<void>;
  updateFolder: (collectionId: string, folderId: string, updates: Partial<Folder>) => Promise<void>;
  moveRequest: (sourceCollectionId: string, requestId: string, targetCollectionId: string, targetFolderId?: string, targetOrder?: number) => Promise<void>;
  moveFolder: (sourceCollectionId: string, folderId: string, targetCollectionId: string, targetParentId?: string) => Promise<void>;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  activeCollectionId: null,
  activeRequestId: null,
  loading: false,
  
  setCollections: (collections) => set({ collections }),
  
  setActiveCollection: (id) => set({ activeCollectionId: id }),
  
  setActiveRequest: (id) => set({ activeRequestId: id }),
  
  loadCollections: async () => {
    set({ loading: true });
    try {
      const data = await collectionsApi.getAll();
      set({ collections: data });
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  addFolder: async (collectionId, name, parentId) => {
    try {
      await collectionsApi.addFolder(collectionId, { name, parentId });
      await get().loadCollections();
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  },
  
  deleteCollection: async (id) => {
    try {
      await collectionsApi.delete(id);
      await get().loadCollections();
    } catch (error) {
      console.error('Failed to delete collection:', error);
      throw error;
    }
  },
  
  deleteFolder: async (collectionId, folderId) => {
    try {
      await collectionsApi.deleteFolder(collectionId, folderId);
      await get().loadCollections();
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error;
    }
  },
  
  deleteRequest: async (collectionId, requestId) => {
    try {
      await collectionsApi.deleteRequest(collectionId, requestId);
      await get().loadCollections();
    } catch (error) {
      console.error('Failed to delete request:', error);
      throw error;
    }
  },
  
  updateCollection: async (id, updates) => {
    try {
      await collectionsApi.update(id, updates);
      await get().loadCollections();
    } catch (error) {
      console.error('Failed to update collection:', error);
      throw error;
    }
  },
  
  updateRequest: async (collectionId, requestId, updates) => {
    try {
      await collectionsApi.updateRequest(collectionId, requestId, updates);
      await get().loadCollections();
    } catch (error) {
      console.error('Failed to update request:', error);
      throw error;
    }
  },

  updateFolder: async (collectionId, folderId, updates) => {
    try {
      await collectionsApi.updateFolder(collectionId, folderId, updates);
      await get().loadCollections();
    } catch (error) {
      console.error('Failed to update folder:', error);
      throw error;
    }
  },

  moveRequest: async (sourceCollectionId, requestId, targetCollectionId, targetFolderId, targetOrder) => {
    try {
      await collectionsApi.moveRequest(sourceCollectionId, requestId, targetCollectionId, targetFolderId, targetOrder);
      await get().loadCollections();
    } catch (error) {
      console.error('Failed to move request:', error);
      throw error;
    }
  },

  moveFolder: async (sourceCollectionId, folderId, targetCollectionId, targetParentId) => {
    try {
      await collectionsApi.moveFolder(sourceCollectionId, folderId, targetCollectionId, targetParentId);
      await get().loadCollections();
    } catch (error) {
      console.error('Failed to move folder:', error);
      throw error;
    }
  },
}));
