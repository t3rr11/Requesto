import { AuthConfig, BodyType, FormDataEntry } from './proxy';

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  collectionId: string;
}

export interface OpenApiSpecLink {
  source: string;
  lastSyncedAt: number;
  specHash?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  folders: Folder[];
  requests: SavedRequest[];
  openApiSpec?: OpenApiSpecLink;
}

/** Stable id of the system-managed catch-all collection. */
export const UNCATEGORIZED_COLLECTION_ID = 'uncategorized';

export interface SavedRequest {
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
}

export interface OpenApiEnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ParsedSpecResult {
  collection: Collection;
  environments: OpenApiEnvironmentVariable[];
  specHash: string;
}
