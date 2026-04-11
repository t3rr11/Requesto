import type { AuthConfig } from '../request/types';

export type SavedRequest = {
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
  folders: Folder[];
  requests: SavedRequest[];
  createdAt: number;
  updatedAt: number;
};
