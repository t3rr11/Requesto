export type OAuthFlowType =
  | 'authorization-code'
  | 'authorization-code-pkce'
  | 'implicit'
  | 'client-credentials'
  | 'password';

export type OAuthTokenStorage = 'memory' | 'session' | 'local';

export type OAuthConfig = {
  id: string;
  name: string;
  provider: string;
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  clientId: string;
  flowType: OAuthFlowType;
  usePKCE: boolean;
  redirectUri?: string;
  scopes: string[];
  additionalParams?: Record<string, string>;
  tokenStorage: OAuthTokenStorage;
  usePopup: boolean;
  autoRefreshToken: boolean;
  tokenRefreshThreshold: number;
  createdAt: number;
  updatedAt: number;
};

export type OAuthTokens = {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  expiresAt?: number;
  refreshToken?: string;
  scope?: string;
  idToken?: string;
};

export type OAuthState = {
  configId: string;
  state: string;
  codeVerifier?: string;
  nonce?: string;
  redirectUri: string;
  timestamp: number;
};

export type OAuthAuth = {
  configId: string;
  config?: OAuthConfig;
  tokens?: OAuthTokens;
  isAuthenticated: boolean;
  isRefreshing: boolean;
  lastAuthenticatedAt?: number;
  error?: string;
};
