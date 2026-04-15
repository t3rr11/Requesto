import type { SavedRequest, Folder } from './collection';

export interface SyncFieldChange {
  field: string;
  from: string;
  to: string;
}

export interface SyncNewItem {
  operationId: string;
  request: SavedRequest;
  folderName?: string;
}

export interface SyncUpdatedItem {
  requestId: string;
  operationId: string;
  name: string;
  changes: SyncFieldChange[];
  mergedRequest: SavedRequest;
}

export interface SyncOrphanedItem {
  requestId: string;
  operationId: string;
  name: string;
}

export interface SyncPreviewResult {
  added: SyncNewItem[];
  updated: SyncUpdatedItem[];
  orphaned: SyncOrphanedItem[];
  unchangedCount: number;
  newSpecHash: string;
  newFolders: Folder[];
}

export interface SyncApplyBody {
  addedOperationIds: string[];
  updatedRequestIds: string[];
  removeRequestIds: string[];
}
