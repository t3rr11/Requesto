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

// OAuth 2.0 Types

export type OAuthFlowType = 
  | 'authorization-code' 
  | 'authorization-code-pkce' 
  | 'implicit' 
  | 'client-credentials' 
  | 'password';

export type OAuthTokenStorage = 'memory' | 'session' | 'local';

/**
 * OAuth Configuration - stored both client and server side
 * Sensitive fields (clientSecret) only stored on server
 */
export interface OAuthConfig {
  id: string; // Unique identifier for this OAuth config
  name: string; // User-friendly name (e.g., "Production Microsoft", "Dev Google")
  
  // Provider info
  provider: string; // 'custom', 'google', 'microsoft', 'github'
  
  // OAuth endpoints
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  
  // Client credentials
  clientId: string;
  // clientSecret stored only on backend
  
  // Flow configuration
  flowType: OAuthFlowType;
  usePKCE: boolean; // Auto-true for authorization-code-pkce
  
  // Redirect configuration
  redirectUri?: string; // Optional override, auto-detected if not set
  
  // Scopes and parameters
  scopes: string[];
  additionalParams?: Record<string, string>; // e.g., { audience: '...', resource: '...' }
  
  // Token storage preference
  tokenStorage: OAuthTokenStorage;
  
  // Advanced options
  usePopup: boolean; // vs full redirect
  autoRefreshToken: boolean;
  tokenRefreshThreshold: number; // seconds before expiry to refresh
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * OAuth tokens - stored client-side only
 */
export interface OAuthTokens {
  accessToken: string;
  tokenType: string; // 'Bearer'
  expiresIn?: number; // seconds
  expiresAt?: number; // timestamp
  refreshToken?: string;
  scope?: string;
  idToken?: string; // for OpenID Connect
}

/**
 * OAuth flow state - temporary, used during authorization flow
 */
export interface OAuthState {
  configId: string;
  state: string; // CSRF token
  codeVerifier?: string; // For PKCE
  nonce?: string; // For OIDC
  redirectUri: string;
  timestamp: number;
}

/**
 * OAuth authentication state for a request
 */
export interface OAuthAuth {
  configId: string; // References OAuthConfig.id
  config?: OAuthConfig; // Optional - for convenience in UI
  tokens?: OAuthTokens; // Populated after authentication
  isAuthenticated: boolean;
  isRefreshing: boolean;
  lastAuthenticatedAt?: number;
  error?: string;
}

export interface AuthConfig {
  type: AuthType;
  basic?: BasicAuth;
  bearer?: BearerAuth;
  apiKey?: ApiKeyAuth;
  digest?: DigestAuth;
  oauth?: OAuthAuth;
}

export interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  auth?: AuthConfig;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}

export interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
  timestamp: number;
}

export interface StreamingResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  events: SSEEvent[];
  duration: number;
  isStreaming: true;
}

// Tab-related types for tabs feature

/**
 * Represents the request state within a tab
 */
export interface TabRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  auth?: AuthConfig;
}

/**
 * Represents a single request tab session
 */
export interface Tab {
  id: string; // Unique tab identifier
  label: string; // Display name (e.g., "GET users" or "New Request")
  request: TabRequest; // Current request configuration
  response: ProxyResponse | StreamingResponse | null; // Last response for this tab
  isDirty: boolean; // Has unsaved changes vs saved collection
  isLoading: boolean; // Is this tab's request currently in-flight
  error: string | null; // Last error for this tab
  
  // Collection linking
  savedRequestId?: string; // Linked collection request ID
  collectionId?: string; // Parent collection ID
  
  // Original saved state for dirty detection
  originalRequest?: TabRequest;
  
  // Metadata
  createdAt: number;
  lastAccessedAt: number;
}

// Environment types

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface EnvironmentsData {
  activeEnvironmentId: string | null;
  environments: Environment[];
}

// History types

export interface HistoryItem {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
  headers?: Record<string, string>;
  body?: string;
}

// Collections types

export interface SavedRequest {
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
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string; // Optional parent folder ID for nesting
  collectionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  folders: Folder[];
  requests: SavedRequest[];
  createdAt: number;
  updatedAt: number;
}

// Console log types (for request debugging)

export interface ConsoleLog {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error' | 'info';
  method?: string;
  url?: string;
  status?: number;
  duration?: number;
  message?: string;
  // Full request/response data for detailed view
  requestData?: ProxyRequest;
  responseData?: ProxyResponse | StreamingResponse;
}
