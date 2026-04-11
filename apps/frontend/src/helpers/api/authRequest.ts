import type { ProxyRequest, AuthConfig } from '../../store/request/types';
import type { OAuthAuth } from '../../store/oauth/types';
import { getTokens, generateAuthorizationHeader } from '../oauth/tokenManager';

/**
 * Inject OAuth tokens into request headers when OAuth auth is configured.
 * All other auth types are handled server-side by the backend proxy.
 */
export function prepareAuthenticatedRequest(request: ProxyRequest): ProxyRequest {
  const { auth } = request;

  if (!auth || auth.type === 'none') return request;

  if (auth.type === 'oauth' && auth.oauth) {
    return prepareOAuthRequest(request, auth.oauth);
  }

  return request;
}

function prepareOAuthRequest(request: ProxyRequest, oauthAuth: OAuthAuth): ProxyRequest {
  const { configId, tokens } = oauthAuth;

  if (tokens?.accessToken) {
    return addOAuthHeader(request, tokens.accessToken);
  }

  const storedTokens = getTokens(configId);
  if (storedTokens?.accessToken) {
    return addOAuthHeader(request, storedTokens.accessToken);
  }

  console.warn(`[OAuth] No access token available for config ${configId}`);
  return request;
}

function addOAuthHeader(request: ProxyRequest, accessToken: string): ProxyRequest {
  return {
    ...request,
    headers: {
      ...request.headers,
      Authorization: generateAuthorizationHeader(accessToken),
    },
  };
}

export function hasValidOAuthToken(auth: AuthConfig | undefined): boolean {
  if (!auth || auth.type !== 'oauth' || !auth.oauth) return false;

  const { configId, tokens } = auth.oauth;

  if (tokens?.accessToken && tokens.expiresAt && tokens.expiresAt > Date.now()) return true;

  const storedTokens = getTokens(configId);
  return !!(storedTokens?.accessToken && storedTokens.expiresAt && storedTokens.expiresAt > Date.now());
}
