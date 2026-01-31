import { Collection, SavedRequest, Folder } from '../../store/types';

const API_BASE = '/api';

export const collectionsApi = {
  // Get all collections
  getAll: async (): Promise<Collection[]> => {
    const res = await fetch(`${API_BASE}/collections`);
    if (!res.ok) throw new Error('Failed to fetch collections');
    return res.json();
  },

  // Get a single collection
  getById: async (id: string): Promise<Collection> => {
    const res = await fetch(`${API_BASE}/collections/${id}`);
    if (!res.ok) throw new Error('Failed to fetch collection');
    return res.json();
  },

  // Create a new collection
  create: async (data: { name: string; description?: string }): Promise<Collection> => {
    const res = await fetch(`${API_BASE}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create collection');
    return res.json();
  },

  // Update a collection
  update: async (id: string, data: { name?: string; description?: string }): Promise<Collection> => {
    const res = await fetch(`${API_BASE}/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update collection');
    return res.json();
  },

  // Delete a collection
  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/collections/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete collection');
  },

  // Add a request to a collection
  addRequest: async (
    collectionId: string,
    data: {
      name: string;
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: string;
      folderId?: string;
    }
  ): Promise<SavedRequest> => {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add request');
    return res.json();
  },

  // Update a request
  updateRequest: async (
    collectionId: string,
    requestId: string,
    data: {
      name?: string;
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: string;
      folderId?: string;
    }
  ): Promise<SavedRequest> => {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/requests/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update request');
    return res.json();
  },

  // Delete a request
  deleteRequest: async (collectionId: string, requestId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/requests/${requestId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete request');
  },

  // Folder operations

  // Add a folder to a collection
  addFolder: async (
    collectionId: string,
    data: {
      name: string;
      parentId?: string;
    }
  ): Promise<Folder> => {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add folder');
    return res.json();
  },

  // Update a folder
  updateFolder: async (
    collectionId: string,
    folderId: string,
    data: {
      name?: string;
      parentId?: string;
    }
  ): Promise<Folder> => {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/folders/${folderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update folder');
    return res.json();
  },

  // Delete a folder
  deleteFolder: async (collectionId: string, folderId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/folders/${folderId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete folder');
  },

  // Move a request to a different collection/folder
  moveRequest: async (
    sourceCollectionId: string,
    requestId: string,
    targetCollectionId: string,
    targetFolderId?: string,
    targetOrder?: number
  ): Promise<SavedRequest> => {
    const res = await fetch(`${API_BASE}/collections/${sourceCollectionId}/requests/${requestId}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCollectionId, targetFolderId, targetOrder }),
    });
    if (!res.ok) throw new Error('Failed to move request');
    return res.json();
  },

  // Move a folder to a different collection/parent
  moveFolder: async (
    sourceCollectionId: string,
    folderId: string,
    targetCollectionId: string,
    targetParentId?: string
  ): Promise<Folder> => {
    const res = await fetch(`${API_BASE}/collections/${sourceCollectionId}/folders/${folderId}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCollectionId, targetParentId }),
    });
    if (!res.ok) throw new Error('Failed to move folder');
    return res.json();
  },
};
