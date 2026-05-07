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

export type BodyType = 'json' | 'form-data' | 'x-www-form-urlencoded';

export type FormDataEntry = {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';
  fileName?: string;
  fileContent?: string;
  enabled: boolean;
};

export type ProxyRequest = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: BodyType;
  formDataEntries?: FormDataEntry[];
  auth?: AuthConfig;
};

/**
 * How body is encoded:
 *  - utf8: body is the decoded text payload (using charset from content-type when present, defaulting to UTF-8).
 *  - base64: body is the raw response bytes encoded as base64. Used for binary content types (PDFs, images, octet-stream, etc.) so payloads survive JSON transport without corruption.
 */
export type BodyEncoding = 'utf8' | 'base64';

export type ProxyResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyEncoding: BodyEncoding;
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
