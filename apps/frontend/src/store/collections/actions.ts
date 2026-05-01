import type { Collection, SavedRequest, Folder, SyncPreviewResult, SyncApplyBody } from './types';
import type { AuthConfig, BodyType, FormDataEntry } from '../request/types';
import { API_BASE } from '../../helpers/api/config';
import { downloadJSON, readJSONFile } from '../../helpers/file';
import { notifyDataMutated } from '../../hooks/useGitAutoRefresh';
import { useTabsStore } from '../tabs/store';

type SetState = (partial: Record<string, unknown>) => void;

// ── Internal API helpers (not exported) ──────────────────────────────────────

async function getAllCollections(): Promise<Collection[]> {
  const res = await fetch(`${API_BASE}/collections`);
  if (!res.ok) throw new Error('Failed to fetch collections');
  return res.json();
}

async function createCollectionApi(data: { name: string; description?: string }): Promise<Collection> {
  const res = await fetch(`${API_BASE}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create collection');
  return res.json();
}

async function updateCollectionApi(id: string, data: { name?: string; description?: string }): Promise<Collection> {
  const res = await fetch(`${API_BASE}/collections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update collection');
  return res.json();
}

async function deleteCollectionApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/collections/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete collection');
}

async function addRequestApi(
  collectionId: string,
  data: {
    name: string; method: string; url: string;
    headers?: Record<string, string>; body?: string;
    auth?: AuthConfig; folderId?: string;
  },
): Promise<SavedRequest> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add request');
  return res.json();
}

async function updateRequestApi(
  collectionId: string,
  requestId: string,
  data: Partial<SavedRequest>,
): Promise<SavedRequest> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/requests/${requestId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update request');
  return res.json();
}

async function deleteRequestApi(collectionId: string, requestId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/requests/${requestId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete request');
}

async function duplicateRequestApi(collectionId: string, requestId: string): Promise<SavedRequest> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/requests/${requestId}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate request');
  return res.json();
}

async function addFolderApi(collectionId: string, data: { name: string; parentId?: string }): Promise<Folder> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add folder');
  return res.json();
}

async function updateFolderApi(collectionId: string, folderId: string, data: Partial<Folder>): Promise<Folder> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/folders/${folderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update folder');
  return res.json();
}

async function deleteFolderApi(collectionId: string, folderId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/folders/${folderId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete folder');
}

async function moveRequestApi(
  sourceCollectionId: string, requestId: string,
  targetCollectionId: string, targetFolderId?: string, targetOrder?: number,
): Promise<SavedRequest> {
  const res = await fetch(`${API_BASE}/collections/${sourceCollectionId}/requests/${requestId}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetCollectionId, targetFolderId, targetOrder }),
  });
  if (!res.ok) throw new Error('Failed to move request');
  return res.json();
}

async function moveFolderApi(
  sourceCollectionId: string, folderId: string,
  targetCollectionId: string, targetParentId?: string,
): Promise<Folder> {
  const res = await fetch(`${API_BASE}/collections/${sourceCollectionId}/folders/${folderId}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetCollectionId, targetParentId }),
  });
  if (!res.ok) throw new Error('Failed to move folder');
  return res.json();
}

// ── Store action implementations ─────────────────────────────────────────────

export async function loadCollections(set: SetState): Promise<void> {
  set({ loading: true });
  try {
    const data = await getAllCollections();
    set({ collections: data });
    notifyDataMutated();
  } catch (error) {
    console.error('Failed to load collections:', error);
  } finally {
    set({ loading: false });
  }
}

export async function createCollection(
  set: SetState,
  data: { name: string; description?: string },
): Promise<Collection> {
  try {
    const collection = await createCollectionApi(data);
    await loadCollections(set);
    return collection;
  } catch (error) {
    console.error('Failed to create collection:', error);
    throw error;
  }
}

export async function addFolder(
  set: SetState, collectionId: string, name: string, parentId?: string,
): Promise<void> {
  try {
    await addFolderApi(collectionId, { name, parentId });
    await loadCollections(set);
  } catch (error) {
    console.error('Failed to create folder:', error);
    throw error;
  }
}

export async function createRequest(
  set: SetState,
  collectionId: string,
  data: {
    name: string; method: string; url: string;
    headers?: Record<string, string>; body?: string;
    bodyType?: BodyType; formDataEntries?: FormDataEntry[];
    auth?: AuthConfig; folderId?: string;
  },
): Promise<SavedRequest> {
  try {
    const request = await addRequestApi(collectionId, data);
    await loadCollections(set);
    return request;
  } catch (error) {
    console.error('Failed to create request:', error);
    throw error;
  }
}

export async function saveRequest(
  set: SetState,
  collectionId: string,
  data: {
    name: string; method: string; url: string;
    headers?: Record<string, string>; body?: string;
    bodyType?: BodyType; formDataEntries?: FormDataEntry[];
    auth?: AuthConfig; folderId?: string;
  },
): Promise<SavedRequest> {
  try {
    const request = await addRequestApi(collectionId, data);
    await loadCollections(set);
    return request;
  } catch (error) {
    console.error('Failed to save request:', error);
    throw error;
  }
}

export async function deleteCollection(set: SetState, id: string): Promise<void> {
  try {
    await deleteCollectionApi(id);
    await loadCollections(set);
  } catch (error) {
    console.error('Failed to delete collection:', error);
  }
}

export async function deleteFolder(set: SetState, collectionId: string, folderId: string): Promise<void> {
  try {
    await deleteFolderApi(collectionId, folderId);
    await loadCollections(set);
  } catch (error) {
    console.error('Failed to delete folder:', error);
  }
}

export async function deleteRequest(set: SetState, collectionId: string, requestId: string): Promise<void> {
  try {
    await deleteRequestApi(collectionId, requestId);
    await loadCollections(set);
  } catch (error) {
    console.error('Failed to delete request:', error);
  }
}

export async function duplicateRequest(set: SetState, collectionId: string, requestId: string): Promise<void> {
  try {
    await duplicateRequestApi(collectionId, requestId);
    await loadCollections(set);
    notifyDataMutated();
  } catch (error) {
    console.error('Failed to duplicate request:', error);
  }
}

export async function updateCollection(set: SetState, id: string, updates: Partial<Collection>): Promise<void> {
  try {
    await updateCollectionApi(id, updates);
    await loadCollections(set);
  } catch (error) {
    console.error('Failed to update collection:', error);
  }
}

export async function updateRequest(
  set: SetState, collectionId: string, requestId: string, updates: Partial<SavedRequest>,
): Promise<void> {
  try {
    await updateRequestApi(collectionId, requestId, updates);
    await loadCollections(set);
    // Keep open tabs in sync with the renamed request so their titles update.
    if (typeof updates.name === 'string') {
      const tabsState = useTabsStore.getState();
      const tab = tabsState.getTabBySavedRequestId(requestId);
      if (tab) tabsState.updateTabLabel(tab.id, updates.name);
    }
  } catch (error) {
    console.error('Failed to update request:', error);
  }
}

export async function updateFolder(
  set: SetState, collectionId: string, folderId: string, updates: Partial<Folder>,
): Promise<void> {
  try {
    await updateFolderApi(collectionId, folderId, updates);
    await loadCollections(set);
  } catch (error) {
    console.error('Failed to update folder:', error);
  }
}

export async function moveRequest(
  set: SetState, sourceCollectionId: string, requestId: string,
  targetCollectionId: string, targetFolderId?: string, targetOrder?: number,
): Promise<void> {
  try {
    await moveRequestApi(sourceCollectionId, requestId, targetCollectionId, targetFolderId, targetOrder);
    await loadCollections(set);
  } catch (error) {
    console.error('Failed to move request:', error);
  }
}

export async function moveFolder(
  set: SetState, sourceCollectionId: string, folderId: string,
  targetCollectionId: string, targetParentId?: string,
): Promise<void> {
  try {
    await moveFolderApi(sourceCollectionId, folderId, targetCollectionId, targetParentId);
    await loadCollections(set);
  } catch (error) {
    console.error('Failed to move folder:', error);
  }
}

// ── Import / export ──────────────────────────────────────────────────────────

export async function importOpenApiCollection(
  set: SetState,
  data: { source: string; name?: string; linkSpec?: boolean },
): Promise<Collection> {
  try {
    const res = await fetch(`${API_BASE}/collections/import-openapi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to import OpenAPI spec' }));
      throw new Error(err.error || 'Failed to import OpenAPI spec');
    }

    const result: { collection: Collection; environments: { key: string; value: string; enabled: boolean }[] } =
      await res.json();

    await loadCollections(set);
    return result.collection;
  } catch (error) {
    console.error('Failed to import OpenAPI collection:', error);
    throw error;
  }
}

export async function importCollection(set: SetState, file: File): Promise<Collection> {
  try {
    const collection = await readJSONFile(file) as Collection;

    const res = await fetch(`${API_BASE}/collections/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection }),
    });
    if (!res.ok) throw new Error('Failed to import collection');

    await loadCollections(set);
    return collection;
  } catch (error) {
    console.error('Failed to import collection:', error);
    throw error;
  }
}

export async function exportCollection(collectionId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/export`);
    if (!res.ok) throw new Error('Failed to export collection');

    const collection: Collection = await res.json();
    const filename = `${collection.name.replace(/[^a-z0-9]/gi, '_')}.requesto-collection.json`;
    downloadJSON(collection, filename);
  } catch (error) {
    console.error('Failed to export collection:', error);
    throw error;
  }
}

export async function exportRequest(collectionId: string, requestId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/export`);
    if (!res.ok) throw new Error('Failed to export request');

    const collection: Collection = await res.json();
    const request = collection.requests.find((r) => r.id === requestId);
    if (!request) throw new Error('Request not found');

    const singleRequestCollection: Collection = {
      ...collection,
      name: request.name,
      requests: [request],
      folders: [],
    };
    const filename = `${request.name.replace(/[^a-z0-9]/gi, '_')}.requesto-collection.json`;
    downloadJSON(singleRequestCollection, filename);
  } catch (error) {
    console.error('Failed to export request:', error);
    throw error;
  }
}

export async function exportFolder(collectionId: string, folderId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/export`);
    if (!res.ok) throw new Error('Failed to export folder');

    const collection: Collection = await res.json();
    const folder = collection.folders.find((f) => f.id === folderId);
    if (!folder) throw new Error('Folder not found');

    const getDescendants = (parentId: string): Folder[] => {
      const children = collection.folders.filter((f) => f.parentId === parentId);
      return children.reduce<Folder[]>(
        (acc, child) => [...acc, child, ...getDescendants(child.id)],
        [],
      );
    };

    const folderIds = [folderId, ...getDescendants(folderId).map((f) => f.id)];
    const foldersInExport = collection.folders.filter((f) => folderIds.includes(f.id));
    const requestsInExport = collection.requests.filter(
      (r) => r.folderId && folderIds.includes(r.folderId),
    );

    const folderCollection: Collection = {
      ...collection,
      name: folder.name,
      folders: foldersInExport.map((f) => ({
        ...f,
        parentId: f.parentId === folderId ? undefined : f.parentId,
      })),
      requests: requestsInExport,
    };

    const filename = `${folder.name.replace(/[^a-z0-9]/gi, '_')}.requesto-collection.json`;
    downloadJSON(folderCollection, filename);
  } catch (error) {
    console.error('Failed to export folder:', error);
    throw error;
  }
}

// Sync

export async function syncPreview(
  collectionId: string,
): Promise<SyncPreviewResult & { noChanges?: boolean }> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/sync-openapi/preview`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to preview sync' }));
    throw new Error(err.error || 'Failed to preview sync');
  }
  return res.json();
}

export async function syncApply(
  set: SetState,
  collectionId: string,
  body: SyncApplyBody,
): Promise<void> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/sync-openapi/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to apply sync' }));
    throw new Error(err.error || 'Failed to apply sync');
  }
  await loadCollections(set);
}

export async function unlinkSpec(set: SetState, collectionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/openapi-link`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to unlink spec' }));
    throw new Error(err.error || 'Failed to unlink spec');
  }
  await loadCollections(set);
}
