export interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  collectionId: string;
  createdAt: number;
  updatedAt: number;
}
