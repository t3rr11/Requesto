import type { OAuthConfig, OAuthTokens } from '../../store/oauth/types';
import { generateCodeVerifier, generateCodeChallenge } from './pkceHelper';
import { saveState, generateState } from './stateHelper';
import { getRedirectUri } from './redirectHelper';
import { API_BASE } from '../api/config';

export type OAuthFlowResult = {
  success: boolean;
  tokens?: OAuthTokens;
  error?: string;
  errorDescription?: string;
};

/**
 * Build the authorization URL including PKCE params when enabled.
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
  const responseType = config.flowType === 'implicit' ? 'token' : 'code';

  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;

  if (config.usePKCE && config.flowType !== 'implicit') {
    codeVerifier = generateCodeVerifier();
    codeChallenge = await generateCodeChallenge(codeVerifier);
  }

  const url = new URL(config.authorizationUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', responseType);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);

  if (codeChallenge) {
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
  }

  if (config.additionalParams) {
    for (const [k, v] of Object.entries(config.additionalParams)) {
      url.searchParams.set(k, v);
    }
  }

  saveState({ configId: config.id, state, codeVerifier, redirectUri, timestamp: Date.now() });

  return { url: url.toString(), state, codeVerifier, redirectUri };
}

export function openOAuthPopup(authUrl: string): Promise<OAuthFlowResult> {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`,
    );

    if (!popup) {
      reject(new Error('Popup blocked by browser. Please allow popups for this site.'));
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type !== 'oauth-callback') return;

      window.removeEventListener('message', onMessage);
      clearInterval(pollClosed);

      resolve(event.data.success
        ? { success: true, tokens: event.data.tokens }
        : { success: false, error: event.data.error, errorDescription: event.data.errorDescription });
    };

    window.addEventListener('message', onMessage);

    const pollClosed = setInterval(() => {
      if (popup.closed) {
        window.removeEventListener('message', onMessage);
        clearInterval(pollClosed);
        resolve({ success: false, error: 'user_cancelled', errorDescription: 'Authentication was cancelled by the user' });
      }
    }, 500);
  });
}

export function redirectToOAuth(authUrl: string): void {
  sessionStorage.setItem('oauth-return-url', window.location.pathname + window.location.search);
  window.location.href = authUrl;
}

export async function startOAuthFlow(config: OAuthConfig): Promise<OAuthFlowResult> {
  if (config.flowType === 'client-credentials') return startClientCredentialsFlow(config);
  if (config.flowType === 'password') return startPasswordFlow(config);

  const { url } = await buildAuthorizationUrl(config);

  if (config.usePopup) {
    try {
      return await openOAuthPopup(url);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Popup blocked')) {
        redirectToOAuth(url);
        return { success: false, error: 'redirect_in_progress', errorDescription: 'Redirecting to OAuth provider...' };
      }
      throw err;
    }
  }

  redirectToOAuth(url);
  return { success: false, error: 'redirect_in_progress', errorDescription: 'Redirecting to OAuth provider...' };
}

export async function exchangeCodeForTokens(configId: string, code: string, codeVerifier?: string): Promise<OAuthTokens> {
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ configId, code, codeVerifier }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to exchange authorization code for tokens');
  }
  const tokens: OAuthTokens = await res.json();
  if (tokens.expiresIn && !tokens.expiresAt) tokens.expiresAt = Date.now() + tokens.expiresIn * 1000;
  return tokens;
}

export async function refreshOAuthToken(configId: string, refreshToken: string): Promise<OAuthTokens> {
  const res = await fetch(`${API_BASE}/oauth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ configId, refreshToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to refresh token');
  }
  const tokens: OAuthTokens = await res.json();
  if (tokens.expiresIn && !tokens.expiresAt) tokens.expiresAt = Date.now() + tokens.expiresIn * 1000;
  return tokens;
}

export async function revokeOAuthToken(configId: string, token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<void> {
  const res = await fetch(`${API_BASE}/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ configId, token, tokenTypeHint }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to revoke token');
  }
}

async function startClientCredentialsFlow(config: OAuthConfig): Promise<OAuthFlowResult> {
  try {
    const res = await fetch(`${API_BASE}/oauth/client-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configId: config.id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Client credentials flow failed', errorDescription: err.details || err.error };
    }
    const tokens: OAuthTokens = await res.json();
    if (tokens.expiresIn && !tokens.expiresAt) tokens.expiresAt = Date.now() + tokens.expiresIn * 1000;
    return { success: true, tokens };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Client credentials flow failed' };
  }
}

async function startPasswordFlow(config: OAuthConfig): Promise<OAuthFlowResult> {
  try {
    const username = config.additionalParams?.username;
    const password = config.additionalParams?.password;
    if (!username || !password) {
      return { success: false, error: 'missing_credentials', errorDescription: 'Username and password are required for password flow' };
    }
    const res = await fetch(`${API_BASE}/oauth/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configId: config.id, username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Password flow failed', errorDescription: err.details || err.error };
    }
    const tokens: OAuthTokens = await res.json();
    if (tokens.expiresIn && !tokens.expiresAt) tokens.expiresAt = Date.now() + tokens.expiresIn * 1000;
    return { success: true, tokens };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Password flow failed' };
  }
}
