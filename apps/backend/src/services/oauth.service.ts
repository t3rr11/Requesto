import axios from 'axios';
import { OAuthRepository } from '../repositories/oauth.repository';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { getHttpsAgent } from '../utils/httpsAgent';
import type {
  OAuthConfigServer,
  OAuthConfigPublic,
  OAuthTokenStatus,
  StoredOAuthToken,
  TokenExchangeResponse,
} from '../models/oauth';

/**
 * Thrown by `getValidAccessToken` when no valid token is available and the
 * grant type requires user interaction (authorization-code / PKCE / implicit)
 * to obtain one. Surfaced to the frontend as a 401 with a special code so it
 * can auto-launch the OAuth popup and retry the request transparently.
 */
export class InteractiveAuthRequiredError extends AppError {
  public readonly configId: string;
  constructor(configId: string, message = 'Interactive OAuth authentication required') {
    super(401, message, ErrorCode.OAUTH_ERROR);
    this.configId = configId;
  }
}

/** ~30 second leeway: refresh slightly before actual expiry. */
const TOKEN_EXPIRY_LEEWAY_MS = 30_000;

function buildProviderHeaders(provider: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
  };
  if (provider === 'github') {
    headers['User-Agent'] = 'Requesto-OAuth-Client';
  }
  return headers;
}

function buildAxiosConfig(provider: string, insecureTls?: boolean) {
  const httpsAgent = getHttpsAgent(insecureTls);
  return {
    headers: buildProviderHeaders(provider),
    ...(httpsAgent && { httpsAgent }),
  };
}

function tokenResponseToStored(response: TokenExchangeResponse): StoredOAuthToken {
  const now = Date.now();
  const stored: StoredOAuthToken = {
    accessToken: response.access_token,
    tokenType: response.token_type || 'Bearer',
    obtainedAt: now,
  };
  if (response.refresh_token) stored.refreshToken = response.refresh_token;
  if (typeof response.expires_in === 'number') {
    stored.expiresAt = now + response.expires_in * 1000;
  }
  if (response.scope) stored.scope = response.scope;
  if (response.id_token) stored.idToken = response.id_token;
  return stored;
}

function isTokenExpired(token: StoredOAuthToken | null): boolean {
  if (!token) return true;
  if (!token.expiresAt) return false;
  return Date.now() >= token.expiresAt - TOKEN_EXPIRY_LEEWAY_MS;
}

function buildTokenStatus(token: StoredOAuthToken | null): OAuthTokenStatus {
  if (!token) {
    return { hasToken: false, hasRefreshToken: false, isExpired: true };
  }
  const status: OAuthTokenStatus = {
    hasToken: true,
    tokenType: token.tokenType,
    hasRefreshToken: !!token.refreshToken,
    isExpired: isTokenExpired(token),
    obtainedAt: token.obtainedAt,
  };
  if (token.expiresAt !== undefined) status.expiresAt = token.expiresAt;
  if (token.scope) status.scope = token.scope;
  if (token.accessToken) {
    const head = token.accessToken.slice(0, 12);
    const tail = token.accessToken.length > 16 ? token.accessToken.slice(-4) : '';
    status.accessTokenPreview = tail ? `${head}…${tail}` : head;
  }
  return status;
}

export class OAuthService {
  /** In-flight refresh / fetch promises per configId, to coalesce concurrent callers. */
  private readonly inflight = new Map<string, Promise<StoredOAuthToken>>();

  constructor(private readonly repo: OAuthRepository) {}

  getAll(): OAuthConfigPublic[] {
    return this.repo.getAll();
  }

  getById(id: string): OAuthConfigPublic {
    const config = this.repo.findById(id, false);
    if (!config) {
      throw AppError.notFound('OAuth configuration not found');
    }
    return config as OAuthConfigPublic;
  }

  create(data: Omit<OAuthConfigServer, 'id' | 'createdAt' | 'updatedAt'>): OAuthConfigPublic {
    return this.repo.create(data);
  }

  update(id: string, updates: Partial<Omit<OAuthConfigServer, 'id' | 'createdAt'>>): OAuthConfigPublic {
    const updated = this.repo.update(id, updates);
    if (!updated) {
      throw AppError.notFound('OAuth configuration not found');
    }
    return updated;
  }

  delete(id: string): void {
    const deleted = this.repo.delete(id);
    if (!deleted) {
      throw AppError.notFound('OAuth configuration not found');
    }
  }

  // ── Token persistence helpers ────────────────────────────────────────────

  /** Public: non-secret token status for display in the frontend. */
  getTokenStatus(configId: string): OAuthTokenStatus {
    return buildTokenStatus(this.repo.getTokens(configId));
  }

  /** Public: clear stored tokens for a config (logout). */
  clearTokens(configId: string): void {
    this.repo.deleteTokens(configId);
  }

  /**
   * Public: persist tokens that the backend received from the frontend
   * (implicit flow only — the access token arrives in a URL fragment that
   * never reaches the backend during the authorization redirect).
   */
  storeImplicitTokens(params: {
    configId: string;
    accessToken: string;
    tokenType?: string;
    expiresIn?: number;
    scope?: string;
    idToken?: string;
  }): void {
    const config = this.repo.findById(params.configId, true);
    if (!config) {
      throw AppError.notFound('OAuth configuration not found');
    }
    const now = Date.now();
    const stored = {
      accessToken: params.accessToken,
      tokenType: params.tokenType ?? 'Bearer',
      obtainedAt: now,
      ...(typeof params.expiresIn === 'number' ? { expiresAt: now + params.expiresIn * 1000 } : {}),
      ...(params.scope !== undefined ? { scope: params.scope } : {}),
      ...(params.idToken !== undefined ? { idToken: params.idToken } : {}),
    };
    this.repo.setTokens(params.configId, stored);
  }

  // ── Token acquisition flows ──────────────────────────────────────────────

  async exchangeToken(params: {
    configId: string;
    code: string;
    codeVerifier?: string;
    redirectUri: string;
    insecureTls?: boolean;
  }): Promise<TokenExchangeResponse> {
    const { configId, code, codeVerifier, redirectUri, insecureTls } = params;

    const config = this.repo.findById(configId, true) as OAuthConfigServer | null;
    if (!config) {
      throw AppError.notFound('OAuth configuration not found');
    }

    const clientSecret = this.repo.getClientSecret(configId);
    // PKCE clients are public — sending a secret is invalid (Microsoft
    // returns AADSTS700025) and other providers may also reject it.
    const isPublicClient = config.flowType === 'authorization-code-pkce';
    const effectiveClientSecret = isPublicClient ? null : clientSecret;

    if (config.provider === 'microsoft' && !effectiveClientSecret && !codeVerifier) {
      throw AppError.badRequest(
        'Microsoft Entra ID requires either a client_secret (for Web apps) or PKCE with code_verifier (for Public clients). Please update your OAuth configuration.',
      );
    }

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
    };

    if (effectiveClientSecret) body.client_secret = effectiveClientSecret;
    if (codeVerifier && config.usePKCE) body.code_verifier = codeVerifier;
    if (config.additionalParams) Object.assign(body, config.additionalParams);

    const response = await axios.post<TokenExchangeResponse>(
      config.tokenUrl,
      new URLSearchParams(body).toString(),
      buildAxiosConfig(config.provider, insecureTls),
    );

    this.repo.setTokens(configId, tokenResponseToStored(response.data));

    return response.data;
  }

  async refreshToken(params: {
    configId: string;
    /** Optional override; if omitted the stored refresh token is used. */
    refreshToken?: string;
    insecureTls?: boolean;
  }): Promise<TokenExchangeResponse> {
    const { configId, insecureTls } = params;

    const config = this.repo.findById(configId, true) as OAuthConfigServer | null;
    if (!config) {
      throw AppError.notFound('OAuth configuration not found');
    }

    const refreshToken = params.refreshToken ?? this.repo.getTokens(configId)?.refreshToken;
    if (!refreshToken) {
      throw AppError.badRequest('No refresh token available for this configuration');
    }

    const clientSecret = this.repo.getClientSecret(configId);
    // PKCE clients are public — never include a secret on refresh.
    const effectiveClientSecret =
      config.flowType === 'authorization-code-pkce' ? null : clientSecret;

    const body: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    };

    if (effectiveClientSecret) body.client_secret = effectiveClientSecret;
    if (config.additionalParams) Object.assign(body, config.additionalParams);

    const response = await axios.post<TokenExchangeResponse>(
      config.tokenUrl,
      new URLSearchParams(body).toString(),
      buildAxiosConfig(config.provider, insecureTls),
    );

    // Some providers (e.g. Google) omit the refresh_token in refresh responses;
    // preserve the existing one so the next refresh still works.
    const stored = tokenResponseToStored(response.data);
    if (!stored.refreshToken) stored.refreshToken = refreshToken;
    this.repo.setTokens(configId, stored);

    return response.data;
  }

  async revokeToken(params: {
    configId: string;
    /** Optional override; if omitted the stored access (or refresh) token is used. */
    token?: string;
    tokenTypeHint?: string;
    insecureTls?: boolean;
  }): Promise<{ success: boolean; note?: string }> {
    const { configId, tokenTypeHint, insecureTls } = params;
    const stored = this.repo.getTokens(configId);
    const token = params.token
      ?? (tokenTypeHint === 'refresh_token' ? stored?.refreshToken : stored?.accessToken);
    if (!token) {
      throw AppError.badRequest('No token available to revoke');
    }

    const config = this.repo.findById(configId, true) as OAuthConfigServer | null;
    if (!config) {
      throw AppError.notFound('OAuth configuration not found');
    }

    if (!config.revocationUrl) {
      throw AppError.badRequest('Token revocation not supported by this provider');
    }

    const clientSecret = this.repo.getClientSecret(configId);
    const effectiveClientSecret =
      config.flowType === 'authorization-code-pkce' ? null : clientSecret;

    const body: Record<string, string> = { token, client_id: config.clientId };
    if (effectiveClientSecret) body.client_secret = effectiveClientSecret;
    if (tokenTypeHint) body.token_type_hint = tokenTypeHint;

    try {
      await axios.post(
        config.revocationUrl,
        new URLSearchParams(body).toString(),
        buildAxiosConfig(config.provider, insecureTls),
      );
      this.repo.deleteTokens(configId);
      return { success: true };
    } catch (revokeError) {
      if (axios.isAxiosError(revokeError)) {
        const status = revokeError.response?.status;
        if (status === 400 || status === 401) {
          this.repo.deleteTokens(configId);
          return { success: true, note: 'Token may have been already revoked' };
        }
      }
      throw revokeError;
    }
  }

  async clientCredentials(params: { configId: string; insecureTls?: boolean }): Promise<TokenExchangeResponse> {
    const { configId, insecureTls } = params;
    const config = this.repo.findById(configId, true) as OAuthConfigServer | null;
    if (!config) {
      throw AppError.notFound('OAuth configuration not found');
    }

    const clientSecret = this.repo.getClientSecret(configId);
    if (!clientSecret) {
      throw AppError.badRequest('Client secret required for client credentials flow');
    }

    const body: Record<string, string> = {
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: clientSecret,
    };

    if (config.scopes && config.scopes.length > 0) {
      body.scope = config.scopes.join(' ');
    }
    if (config.additionalParams) Object.assign(body, config.additionalParams);

    const response = await axios.post<TokenExchangeResponse>(
      config.tokenUrl,
      new URLSearchParams(body).toString(),
      buildAxiosConfig(config.provider, insecureTls),
    );

    this.repo.setTokens(configId, tokenResponseToStored(response.data));

    return response.data;
  }

  async passwordFlow(params: {
    configId: string;
    username: string;
    password: string;
    insecureTls?: boolean;
  }): Promise<TokenExchangeResponse> {
    const { configId, username, password, insecureTls } = params;

    const config = this.repo.findById(configId, true) as OAuthConfigServer | null;
    if (!config) {
      throw AppError.notFound('OAuth configuration not found');
    }

    const clientSecret = this.repo.getClientSecret(configId);

    const body: Record<string, string> = {
      grant_type: 'password',
      username,
      password,
      client_id: config.clientId,
    };

    if (clientSecret) body.client_secret = clientSecret;

    if (config.scopes && config.scopes.length > 0) {
      body.scope = config.scopes.join(' ');
    }
    if (config.additionalParams) Object.assign(body, config.additionalParams);

    const response = await axios.post<TokenExchangeResponse>(
      config.tokenUrl,
      new URLSearchParams(body).toString(),
      buildAxiosConfig(config.provider, insecureTls),
    );

    this.repo.setTokens(configId, tokenResponseToStored(response.data));

    return response.data;
  }

  // ── Auto-resolve token at request time ───────────────────────────────────

  /**
   * Returns a non-expired access token for the given config.
   *
   * Strategy:
   *  1. Use cached token if not expired (with leeway).
   *  2. If a refresh token exists, refresh.
   *  3. For non-interactive grants (`client-credentials`, `password` with
   *     stored creds), silently fetch a new token.
   *  4. Otherwise throw `InteractiveAuthRequiredError` so the caller can
   *     prompt the user to (re-)authenticate.
   *
   * Concurrent callers for the same configId share a single in-flight promise.
   */
  async getValidAccessToken(configId: string, insecureTls?: boolean): Promise<StoredOAuthToken> {
    const cached = this.repo.getTokens(configId);
    if (cached && !isTokenExpired(cached)) return cached;

    const existing = this.inflight.get(configId);
    if (existing) return existing;

    const promise = this.acquireToken(configId, cached, insecureTls).finally(() => {
      this.inflight.delete(configId);
    });
    this.inflight.set(configId, promise);
    return promise;
  }

  private async acquireToken(
    configId: string,
    cached: StoredOAuthToken | null,
    insecureTls?: boolean,
  ): Promise<StoredOAuthToken> {
    const config = this.repo.findById(configId, true) as OAuthConfigServer | null;
    if (!config) {
      throw AppError.notFound(`OAuth configuration not found: ${configId}`);
    }

    // 1. Try refresh token if available
    if (cached?.refreshToken) {
      try {
        await this.refreshToken({ configId, refreshToken: cached.refreshToken, insecureTls });
        const refreshed = this.repo.getTokens(configId);
        if (refreshed) return refreshed;
      } catch (err) {
        // Refresh failed (e.g. refresh token revoked) — fall through to grant-specific re-fetch.
        console.warn(`[oauth] refresh failed for config ${configId}:`, err instanceof Error ? err.message : err);
      }
    }

    // 2. Grant-specific silent re-fetch
    const flowType = config.flowType;
    if (flowType === 'client-credentials') {
      await this.clientCredentials({ configId, insecureTls });
      const fresh = this.repo.getTokens(configId);
      if (fresh) return fresh;
    }

    if (flowType === 'password') {
      const username = config.additionalParams?.username;
      const password = config.additionalParams?.password;
      if (username && password) {
        await this.passwordFlow({ configId, username, password, insecureTls });
        const fresh = this.repo.getTokens(configId);
        if (fresh) return fresh;
      }
    }

    // 3. Interactive flow required
    throw new InteractiveAuthRequiredError(configId);
  }
}
