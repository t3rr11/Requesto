export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'digest' | 'oauth';

export interface BasicAuth {
  username: string;
  password: string;
}

export interface BearerAuth {
  token: string;
}

export interface ApiKeyAuth {
  key: string;
  value: string;
  addTo: 'header' | 'query';
}

export interface DigestAuth {
  username: string;
  password: string;
}

export interface OAuthAuth {
  configId: string;
}

export interface AuthConfig {
  type: AuthType;
  basic?: BasicAuth;
  bearer?: BearerAuth;
  apiKey?: ApiKeyAuth;
  digest?: DigestAuth;
  oauth?: OAuthAuth;
}

export type BodyType = 'json' | 'form-data' | 'x-www-form-urlencoded';

export interface FormDataEntry {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';
  fileName?: string;
  fileContent?: string;
  enabled: boolean;
}

export interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: BodyType;
  formDataEntries?: FormDataEntry[];
  auth?: AuthConfig;
  /**
   * When true, ignore TLS certificate errors (e.g. self-signed certs in
   * chain). Driven by a global user setting on the frontend.
   */
  insecureTls?: boolean;
}

/**
 * How body is encoded:
 *  - utf8: body is the decoded text payload (using charset from content-type when present, defaulting to UTF-8).
 *  - base64: body is the raw response bytes encoded as base64. Used for binary content types (PDFs, images, octet-stream, etc.) so payloads survive JSON transport without corruption.
 */
export type BodyEncoding = 'utf8' | 'base64';

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyEncoding: BodyEncoding;
  duration: number;
}
