import type { AuthConfig, BodyType, FormDataEntry } from '../request/types';

export type OpenApiSpecLink = {
  source: string;
  lastSyncedAt: number;
  specHash?: string;
};

export type SavedRequest = {
  id: string;
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: BodyType;
  formDataEntries?: FormDataEntry[];
  auth?: AuthConfig;
  collectionId: string;
  folderId?: string;
  order?: number;
  operationId?: string;
  createdAt: number;
  updatedAt: number;
};

export type Folder = {
  id: string;
  name: string;
  parentId?: string;
  collectionId: string;
  createdAt: number;
  updatedAt: number;
};

export type Collection = {
  id: string;
  name: string;
  description?: string;
  /** Set on system-managed collections (e.g. "Uncategorized"). Prevents rename/delete in the UI. */
  isSystem?: boolean;
  folders: Folder[];
  requests: SavedRequest[];
  openApiSpec?: OpenApiSpecLink;
  createdAt: number;
  updatedAt: number;
};

// Sync preview types

export type SyncFieldChange = {
  field: string;
  from: string;
  to: string;
};

export type SyncNewItem = {
  operationId: string;
  request: SavedRequest;
  folderName?: string;
};

export type SyncUpdatedItem = {
  requestId: string;
  operationId: string;
  name: string;
  changes: SyncFieldChange[];
  mergedRequest: SavedRequest;
};

export type SyncOrphanedItem = {
  requestId: string;
  operationId: string;
  name: string;
};

export type SyncPreviewResult = {
  added: SyncNewItem[];
  updated: SyncUpdatedItem[];
  orphaned: SyncOrphanedItem[];
  unchangedCount: number;
  newSpecHash: string;
  newFolders: Folder[];
};

export type SyncApplyBody = {
  addedOperationIds: string[];
  updatedRequestIds: string[];
  removeRequestIds: string[];
};
