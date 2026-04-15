/**
 * Full OAuth configuration stored on backend.
 * Includes sensitive clientSecret — never sent to frontend.
 */
export interface OAuthConfigServer {
  id: string;
  name: string;
  provider: string;
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  clientId: string;
  clientSecret?: string;
  flowType: string;
  usePKCE: boolean;
  scopes: string[];
  additionalParams?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

/** Public-safe OAuth config — clientSecret stripped before sending to frontend */
export type OAuthConfigPublic = Omit<OAuthConfigServer, 'clientSecret'>;

export interface OAuthData {
  configs: OAuthConfigPublic[];
}

export interface OAuthSecretsData {
  secrets: Record<string, string>;
}

export interface TokenExchangeRequest {
  configId: string;
  code: string;
  codeVerifier?: string;
  redirectUri: string;
}

export interface TokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface TokenRefreshRequest {
  configId: string;
  refreshToken: string;
}

export interface TokenRevokeRequest {
  configId: string;
  token: string;
  tokenTypeHint?: string;
}
