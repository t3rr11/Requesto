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
};

export type OAuthState = {
  configId: string;
  state: string;
  codeVerifier?: string;
  nonce?: string;
  redirectUri: string;
  timestamp: number;
};

/**
 * Reference to an OAuth configuration on a request. Tokens are owned and
 * resolved by the backend; the frontend only needs the configId.
 */
export type OAuthAuth = {
  configId: string;
};

/**
 * Non-secret token status fetched from the backend for display purposes
 * (e.g. "Authenticated · expires in 5m" badges in the OAuth manager).
 * Mirrors the backend `OAuthTokenStatus` model.
 */
export type OAuthTokenStatus = {
  hasToken: boolean;
  tokenType?: string;
  expiresAt?: number;
  scope?: string;
  obtainedAt?: number;
  hasRefreshToken: boolean;
  accessTokenPreview?: string;
  isExpired: boolean;
};
