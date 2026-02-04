/**
 * OAuth Flow Handler
 * Orchestrates OAuth 2.0 authentication flows
 */

import { OAuthConfig, OAuthTokens } from '../../types';
import { generateCodeVerifier, generateCodeChallenge } from './pkceHelper';
import { saveState, generateState } from './stateHelper';
import { getRedirectUri } from './redirectHelper';
import { API_BASE } from '../api/config';

export interface AuthorizationParams {
  authorizationUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  responseType: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  additionalParams?: Record<string, string>;
}

export interface OAuthFlowResult {
  success: boolean;
  tokens?: OAuthTokens;
  error?: string;
  errorDescription?: string;
}

/**
 * Build authorization URL for OAuth flow
 */
export async function buildAuthorizationUrl(config: OAuthConfig): Promise<{
  url: string;
  state: string;
  codeVerifier?: string;
  redirectUri: string;
}> {
  const redirectUri = config.redirectUri || getRedirectUri();
  const state = generateState();
  const scope = config.scopes.join(' ');
  
  // Determine response type based on flow type
  let responseType = 'code';
  if (config.flowType === 'implicit') {
    responseType = 'token';
  }
  
  // Build base params
  const params: AuthorizationParams = {
    authorizationUrl: config.authorizationUrl,
    clientId: config.clientId,
    redirectUri,
    scope,
    state,
    responseType,
    additionalParams: config.additionalParams,
  };
  
  // Add PKCE parameters if enabled
  let codeVerifier: string | undefined;
  if (config.usePKCE && config.flowType !== 'implicit') {
    codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    params.codeChallenge = codeChallenge;
    params.codeChallengeMethod = 'S256';
  }
  
  // Build URL with query parameters
  const url = new URL(config.authorizationUrl);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', params.responseType);
  url.searchParams.set('scope', params.scope);
  url.searchParams.set('state', params.state);
  
  if (params.codeChallenge) {
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', params.codeChallengeMethod!);
  }
  
  // Add additional provider-specific parameters
  if (params.additionalParams) {
    Object.entries(params.additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  // Save state for later validation
  saveState({
    configId: config.id,
    state,
    codeVerifier,
    redirectUri,
    timestamp: Date.now(),
  });
  
  return {
    url: url.toString(),
    state,
    codeVerifier,
    redirectUri,
  };
}

/**
 * Open OAuth flow in a popup window
 */
export function openOAuthPopup(authUrl: string): Promise<OAuthFlowResult> {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
    
    if (!popup) {
      reject(new Error('Popup blocked by browser. Please allow popups for this site.'));
      return;
    }
    
    // Listen for message from popup
    const messageHandler = (event: MessageEvent) => {
      // Security: Validate origin
      if (event.origin !== window.location.origin) {
        return;
      }
      
      if (event.data.type === 'oauth-callback') {
        window.removeEventListener('message', messageHandler);
        clearInterval(checkClosed);
        
        if (event.data.success) {
          resolve({
            success: true,
            tokens: event.data.tokens,
          });
        } else {
          resolve({
            success: false,
            error: event.data.error,
            errorDescription: event.data.errorDescription,
          });
        }
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Check if popup was closed by user
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        window.removeEventListener('message', messageHandler);
        clearInterval(checkClosed);
        resolve({
          success: false,
          error: 'user_cancelled',
          errorDescription: 'Authentication was cancelled by the user',
        });
      }
    }, 500);
  });
}

/**
 * Initiate OAuth flow with full page redirect
 */
export function redirectToOAuth(authUrl: string): void {
  // Store current location to return after OAuth
  sessionStorage.setItem('oauth-return-url', window.location.pathname + window.location.search);
  
  // Redirect to OAuth provider
  window.location.href = authUrl;
}

/**
 * Start OAuth flow (popup or redirect based on config)
 */
export async function startOAuthFlow(config: OAuthConfig): Promise<OAuthFlowResult> {
  // Handle non-interactive flows
  if (config.flowType === 'client-credentials') {
    return await startClientCredentialsFlow(config);
  }
  
  if (config.flowType === 'password') {
    return await startPasswordFlow(config);
  }
  
  // Handle interactive flows (authorization code, PKCE, implicit)
  const { url } = await buildAuthorizationUrl(config);
  
  if (config.usePopup) {
    try {
      return await openOAuthPopup(url);
    } catch (error) {
      // If popup fails, fall back to redirect
      if (error instanceof Error && error.message.includes('Popup blocked')) {
        console.warn('Popup blocked, falling back to redirect');
        redirectToOAuth(url);
        
        // Return pending result (actual result will come after redirect back)
        return {
          success: false,
          error: 'redirect_in_progress',
          errorDescription: 'Redirecting to OAuth provider...',
        };
      }
      throw error;
    }
  } else {
    redirectToOAuth(url);
    
    // Return pending result (actual result will come after redirect back)
    return {
      success: false,
      error: 'redirect_in_progress',
      errorDescription: 'Redirecting to OAuth provider...',
    };
  }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  configId: string,
  code: string,
  codeVerifier?: string
): Promise<OAuthTokens> {
  const response = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      configId,
      code,
      codeVerifier,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to exchange authorization code for tokens');
  }
  
  const tokens: OAuthTokens = await response.json();
  
  // Add expiresAt timestamp if not present
  if (tokens.expiresIn && !tokens.expiresAt) {
    tokens.expiresAt = Date.now() + tokens.expiresIn * 1000;
  }
  
  return tokens;
}

/**
 * Refresh OAuth token
 */
export async function refreshOAuthToken(
  configId: string,
  refreshToken: string
): Promise<OAuthTokens> {
  const response = await fetch(`${API_BASE}/oauth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      configId,
      refreshToken,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to refresh token');
  }
  
  const tokens: OAuthTokens = await response.json();
  
  // Add expiresAt timestamp if not present
  if (tokens.expiresIn && !tokens.expiresAt) {
    tokens.expiresAt = Date.now() + tokens.expiresIn * 1000;
  }
  
  return tokens;
}

/**
 * Revoke OAuth token
 */
export async function revokeOAuthToken(
  configId: string,
  token: string,
  tokenTypeHint?: 'access_token' | 'refresh_token'
): Promise<void> {
  const response = await fetch(`${API_BASE}/oauth/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      configId,
      token,
      tokenTypeHint,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to revoke token');
  }
}

/**
 * Start Client Credentials Flow
 * Machine-to-machine authentication without user interaction
 */
export async function startClientCredentialsFlow(config: OAuthConfig): Promise<OAuthFlowResult> {
  try {
    const response = await fetch(`${API_BASE}/oauth/client-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        configId: config.id,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Client credentials flow failed',
        errorDescription: errorData.details || errorData.error,
      };
    }
    
    const tokens: OAuthTokens = await response.json();
    
    // Add expiresAt timestamp if not present
    if (tokens.expiresIn && !tokens.expiresAt) {
      tokens.expiresAt = Date.now() + tokens.expiresIn * 1000;
    }
    
    return {
      success: true,
      tokens,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Client credentials flow failed',
    };
  }
}

/**
 * Start Password Flow (Resource Owner Password Credentials)
 * DEPRECATED: Only use when absolutely necessary
 * Requires username and password to be provided in config
 */
export async function startPasswordFlow(config: OAuthConfig): Promise<OAuthFlowResult> {
  try {
    // Password flow requires username and password in additionalParams
    const username = config.additionalParams?.username;
    const password = config.additionalParams?.password;
    
    if (!username || !password) {
      return {
        success: false,
        error: 'missing_credentials',
        errorDescription: 'Username and password are required for password flow',
      };
    }
    
    const response = await fetch(`${API_BASE}/oauth/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        configId: config.id,
        username,
        password,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Password flow failed',
        errorDescription: errorData.details || errorData.error,
      };
    }
    
    const tokens: OAuthTokens = await response.json();
    
    // Add expiresAt timestamp if not present
    if (tokens.expiresIn && !tokens.expiresAt) {
      tokens.expiresAt = Date.now() + tokens.expiresIn * 1000;
    }
    
    return {
      success: true,
      tokens,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Password flow failed',
    };
  }
}
