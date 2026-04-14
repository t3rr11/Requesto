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

// OAuth Types

/**
 * OAuth configuration stored on backend
 * Includes sensitive clientSecret that should never be sent to frontend
 */
export interface OAuthConfigServer {
  id: string;
  name: string;
  provider: string;
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  clientId: string;
  clientSecret?: string; // Sensitive - never sent to frontend
  flowType: string;
  usePKCE: boolean;
  scopes: string[];
  additionalParams?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Request to exchange authorization code for tokens
 */
export interface TokenExchangeRequest {
  configId: string;
  code: string;
  codeVerifier?: string; // For PKCE
  redirectUri: string;
}

/**
 * Response from OAuth provider token endpoint
 */
export interface TokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

/**
 * Request to refresh an access token
 */
export interface TokenRefreshRequest {
  configId: string;
  refreshToken: string;
}

/**
 * OAuth auth reference (simplified for backend)
 */
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

// Workspace Types

export type Workspace = {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  updatedAt: number;
};

export type WorkspacesRegistry = {
  activeWorkspaceId: string;
  workspaces: Workspace[];
};
