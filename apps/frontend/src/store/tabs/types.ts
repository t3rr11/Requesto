import type { AuthConfig } from '../request/types';
import type { ProxyResponse, StreamingResponse } from '../request/types';

export type TabRequest = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  auth?: AuthConfig;
};

export type Tab = {
  id: string;
  label: string;
  request: TabRequest;
  response: ProxyResponse | StreamingResponse | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  savedRequestId?: string;
  collectionId?: string;
  originalRequest?: TabRequest;
  createdAt: number;
  lastAccessedAt: number;
};

export type HistoryItem = {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
  headers?: Record<string, string>;
  body?: string;
};
