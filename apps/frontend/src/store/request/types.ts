import type { OAuthAuth } from '../oauth/types';

export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'digest' | 'oauth';

export type BasicAuth = {
  username: string;
  password: string;
};

export type BearerAuth = {
  token: string;
};

export type ApiKeyAuth = {
  key: string;
  value: string;
  addTo: 'header' | 'query';
};

export type DigestAuth = {
  username: string;
  password: string;
};

export type AuthConfig = {
  type: AuthType;
  basic?: BasicAuth;
  bearer?: BearerAuth;
  apiKey?: ApiKeyAuth;
  digest?: DigestAuth;
  oauth?: OAuthAuth;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type ProxyRequest = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  auth?: AuthConfig;
};

export type ProxyResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
};

export type SSEEvent = {
  id?: string;
  event?: string;
  data: string;
  timestamp: number;
};

export type StreamingResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  events: SSEEvent[];
  duration: number;
  isStreaming: true;
};

export type ConsoleLogType = 'request' | 'response' | 'error' | 'info';

export type ConsoleLog = {
  id: string;
  requestId?: string;
  timestamp: number;
  type: ConsoleLogType;
  method?: string;
  url?: string;
  status?: number;
  duration?: number;
  message?: string;
  requestData?: ProxyRequest;
  responseData?: ProxyResponse | StreamingResponse;
};
