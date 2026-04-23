import axios from 'axios';
import { OAuthRepository } from '../repositories/oauth.repository';
import { AppError } from '../errors/app-error';
import { getHttpsAgent } from '../utils/httpsAgent';
import type { OAuthConfigServer, OAuthConfigPublic, TokenExchangeResponse } from '../models/oauth';

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

export class OAuthService {
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

    if (config.provider === 'microsoft' && !clientSecret && !codeVerifier) {
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

    if (clientSecret) body.client_secret = clientSecret;
    if (codeVerifier && config.usePKCE) body.code_verifier = codeVerifier;
    if (config.additionalParams) Object.assign(body, config.additionalParams);

    const response = await axios.post<TokenExchangeResponse>(
      config.tokenUrl,
      new URLSearchParams(body).toString(),
      buildAxiosConfig(config.provider, insecureTls),
    );

    return response.data;
  }

  async refreshToken(params: {
    configId: string;
    refreshToken: string;
    insecureTls?: boolean;
  }): Promise<TokenExchangeResponse> {
    const { configId, refreshToken, insecureTls } = params;

    const config = this.repo.findById(configId, true) as OAuthConfigServer | null;
    if (!config) {
      throw AppError.notFound('OAuth configuration not found');
    }

    const clientSecret = this.repo.getClientSecret(configId);

    const body: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    };

    if (clientSecret) body.client_secret = clientSecret;
    if (config.additionalParams) Object.assign(body, config.additionalParams);

    const response = await axios.post<TokenExchangeResponse>(
      config.tokenUrl,
      new URLSearchParams(body).toString(),
      buildAxiosConfig(config.provider, insecureTls),
    );

    return response.data;
  }

  async revokeToken(params: {
    configId: string;
    token: string;
    tokenTypeHint?: string;
    insecureTls?: boolean;
  }): Promise<{ success: boolean; note?: string }> {
    const { configId, token, tokenTypeHint, insecureTls } = params;

    const config = this.repo.findById(configId, true) as OAuthConfigServer | null;
    if (!config) {
      throw AppError.notFound('OAuth configuration not found');
    }

    if (!config.revocationUrl) {
      throw AppError.badRequest('Token revocation not supported by this provider');
    }

    const clientSecret = this.repo.getClientSecret(configId);

    const body: Record<string, string> = { token, client_id: config.clientId };
    if (clientSecret) body.client_secret = clientSecret;
    if (tokenTypeHint) body.token_type_hint = tokenTypeHint;

    try {
      await axios.post(
        config.revocationUrl,
        new URLSearchParams(body).toString(),
        buildAxiosConfig(config.provider, insecureTls),
      );
      return { success: true };
    } catch (revokeError) {
      if (axios.isAxiosError(revokeError)) {
        const status = revokeError.response?.status;
        if (status === 400 || status === 401) {
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

    return response.data;
  }
}
