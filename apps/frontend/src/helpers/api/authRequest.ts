/**
 * Auth Request Helper
 * Prepares requests with authentication, including OAuth token injection
 */

import { ProxyRequest, AuthConfig, OAuthAuth } from '../../types';
import { getTokens, generateAuthorizationHeader } from '../oauth/tokenManager';

/**
 * Prepare request with authentication
 * Injects OAuth tokens into headers if OAuth auth is configured
 */
export function prepareAuthenticatedRequest(request: ProxyRequest): ProxyRequest {
  const { auth } = request;
  
  if (!auth || auth.type === 'none') {
    return request;
  }
  
  // For OAuth, inject the access token as a Bearer token
  if (auth.type === 'oauth' && auth.oauth) {
    return prepareOAuthRequest(request, auth.oauth);
  }
  
  // All other auth types are handled by the backend
  return request;
}

/**
 * Prepare request with OAuth authentication
 * Retrieves token from storage and adds Authorization header
 */
function prepareOAuthRequest(request: ProxyRequest, oauthAuth: OAuthAuth): ProxyRequest {
  const { configId, tokens } = oauthAuth;
  
  // If tokens are already in the auth object (e.g., from recently authenticated)
  if (tokens?.accessToken) {
    return addOAuthHeader(request, tokens.accessToken);
  }
  
  // Otherwise, try to load from storage
  const storedTokens = getTokens(configId);
  
  if (storedTokens?.accessToken) {
    return addOAuthHeader(request, storedTokens.accessToken);
  }
  
  // No tokens available - request will be sent without OAuth header
  console.warn(`[OAuth] No access token available for config ${configId}`);
  return request;
}

/**
 * Add OAuth Authorization header to request
 */
function addOAuthHeader(request: ProxyRequest, accessToken: string): ProxyRequest {
  const authHeader = generateAuthorizationHeader(accessToken);
  
  return {
    ...request,
    headers: {
      ...request.headers,
      'Authorization': authHeader,
    },
  };
}

/**
 * Check if request has valid OAuth authentication
 */
export function hasValidOAuthToken(auth: AuthConfig | undefined): boolean {
  if (!auth || auth.type !== 'oauth' || !auth.oauth) {
    return false;
  }
  
  const { configId, tokens } = auth.oauth;
  
  // Check if tokens are in the auth object
  if (tokens?.accessToken && tokens.expiresAt && tokens.expiresAt > Date.now()) {
    return true;
  }
  
  // Check storage
  const storedTokens = getTokens(configId);
  if (storedTokens?.accessToken && storedTokens.expiresAt && storedTokens.expiresAt > Date.now()) {
    return true;
  }
  
  return false;
}
