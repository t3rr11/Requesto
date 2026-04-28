import { AuthConfig } from '../models/proxy';

/**
 * Resolves a valid OAuth access token (auto-refreshing or auto-fetching as
 * possible). Throws `InteractiveAuthRequiredError` when interactive flow is
 * needed.
 */
export type OAuthTokenResolver = (
  configId: string,
) => Promise<{ accessToken: string; tokenType: string }>;

/**
 * Apply authentication to a set of request headers and URL.
 * Mutates neither the original headers nor the URL — returns new values.
 *
 * For OAuth, the supplied `oauthResolver` is called to obtain a fresh token.
 * If the user has manually set an `Authorization` header it takes precedence
 * (we don't overwrite it).
 */
export async function applyAuthentication(
  auth: AuthConfig | undefined,
  headers: Record<string, string> = {},
  url: string,
  oauthResolver?: OAuthTokenResolver,
): Promise<{ headers: Record<string, string>; url: string }> {
  const updatedHeaders = { ...headers };
  let updatedUrl = url;

  if (!auth || auth.type === 'none') {
    return { headers: updatedHeaders, url: updatedUrl };
  }

  const hasUserAuthHeader = Object.keys(updatedHeaders).some(
    (k) => k.toLowerCase() === 'authorization',
  );

  switch (auth.type) {
    case 'basic':
      if (auth.basic && !hasUserAuthHeader) {
        const credentials = `${auth.basic.username}:${auth.basic.password}`;
        const encodedCredentials = Buffer.from(credentials).toString('base64');
        updatedHeaders['Authorization'] = `Basic ${encodedCredentials}`;
      }
      break;

    case 'bearer':
      if (auth.bearer?.token && !hasUserAuthHeader) {
        updatedHeaders['Authorization'] = `Bearer ${auth.bearer.token}`;
      }
      break;

    case 'api-key':
      if (auth.apiKey?.key && auth.apiKey?.value) {
        if (auth.apiKey.addTo === 'header') {
          updatedHeaders[auth.apiKey.key] = auth.apiKey.value;
        } else if (auth.apiKey.addTo === 'query') {
          const urlObj = new URL(updatedUrl);
          urlObj.searchParams.set(auth.apiKey.key, auth.apiKey.value);
          updatedUrl = urlObj.toString();
        }
      }
      break;

    case 'digest':
      // Digest auth is handled by axios via getAxiosAuthConfig()
      break;

    case 'oauth':
      if (auth.oauth?.configId && !hasUserAuthHeader && oauthResolver) {
        const token = await oauthResolver(auth.oauth.configId);
        updatedHeaders['Authorization'] = `${token.tokenType || 'Bearer'} ${token.accessToken}`;
      }
      break;
  }

  return { headers: updatedHeaders, url: updatedUrl };
}

/** Returns true when the auth type requires special handling (e.g. digest via axios). */
export function requiresSpecialAuthHandling(auth: AuthConfig | undefined): boolean {
  return auth?.type === 'digest';
}

/** Build the auth config object for axios (used for digest auth). */
export function getAxiosAuthConfig(
  auth: AuthConfig | undefined,
): { username: string; password: string } | undefined {
  if (auth?.type === 'digest' && auth.digest) {
    return {
      username: auth.digest.username,
      password: auth.digest.password,
    };
  }
  return undefined;
}
