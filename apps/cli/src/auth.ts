import type { AuthConfig, OAuthToken } from './types';

export type OAuthTokenResolver = (configId: string) => Promise<{ accessToken: string; tokenType: string }>;

function hasAuthHeader(headers: Record<string, string>): boolean {
  return Object.keys(headers).some((k) => k.toLowerCase() === 'authorization');
}

export async function applyAuthentication(
  auth: AuthConfig | undefined,
  headers: Record<string, string>,
  url: string,
  oauthResolver?: OAuthTokenResolver,
): Promise<{ headers: Record<string, string>; url: string }> {
  const h = { ...headers };
  let u = url;

  if (!auth || auth.type === 'none') return { headers: h, url: u };

  switch (auth.type) {
    case 'basic':
      if (auth.basic && !hasAuthHeader(h)) {
        const encoded = Buffer.from(`${auth.basic.username}:${auth.basic.password}`).toString('base64');
        h['Authorization'] = `Basic ${encoded}`;
      }
      break;

    case 'bearer':
      if (auth.bearer?.token && !hasAuthHeader(h)) {
        h['Authorization'] = `Bearer ${auth.bearer.token}`;
      }
      break;

    case 'api-key':
      if (auth.apiKey?.key && auth.apiKey?.value) {
        if (auth.apiKey.addTo === 'header') {
          h[auth.apiKey.key] = auth.apiKey.value;
        } else {
          const urlObj = new URL(u);
          urlObj.searchParams.set(auth.apiKey.key, auth.apiKey.value);
          u = urlObj.toString();
        }
      }
      break;

    case 'digest':
      // Digest auth passed to axios separately via getDigestAuthConfig
      break;

    case 'oauth':
      if (auth.oauth?.configId && !hasAuthHeader(h) && oauthResolver) {
        const token = await oauthResolver(auth.oauth.configId);
        h['Authorization'] = `${token.tokenType || 'Bearer'} ${token.accessToken}`;
      }
      break;
  }

  return { headers: h, url: u };
}

export function getDigestAuthConfig(
  auth: AuthConfig | undefined,
): { username: string; password: string } | undefined {
  if (auth?.type === 'digest' && auth.digest) {
    return { username: auth.digest.username, password: auth.digest.password };
  }
  return undefined;
}

/** Build an OAuthTokenResolver that reads cached tokens from oauth-tokens.json. */
export function buildOAuthResolver(tokens: Record<string, OAuthToken>): OAuthTokenResolver {
  return async (configId) => {
    const token = tokens[configId];
    if (!token) {
      throw new Error(
        `No OAuth token cached for config "${configId}".\n` +
        `Obtain a token via the Requesto desktop app, or inject the access token ` +
        `as a bearer token using REQUESTO_VAR_* environment variables.`,
      );
    }
    if (token.expiresAt && Date.now() > token.expiresAt) {
      throw new Error(
        `OAuth token for config "${configId}" has expired.\n` +
        `Refresh it via the Requesto desktop app.`,
      );
    }
    return { accessToken: token.accessToken, tokenType: token.tokenType || 'Bearer' };
  };
}
