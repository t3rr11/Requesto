import { AuthConfig } from '../models/proxy';

/**
 * Apply authentication to a set of request headers and URL.
 * Mutates neither the original headers nor the URL — returns new values.
 */
export function applyAuthentication(
  auth: AuthConfig | undefined,
  headers: Record<string, string> = {},
  url: string,
): { headers: Record<string, string>; url: string } {
  const updatedHeaders = { ...headers };
  let updatedUrl = url;

  if (!auth || auth.type === 'none') {
    return { headers: updatedHeaders, url: updatedUrl };
  }

  switch (auth.type) {
    case 'basic':
      if (auth.basic) {
        const credentials = `${auth.basic.username}:${auth.basic.password}`;
        const encodedCredentials = Buffer.from(credentials).toString('base64');
        updatedHeaders['Authorization'] = `Basic ${encodedCredentials}`;
      }
      break;

    case 'bearer':
      if (auth.bearer?.token) {
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
      // OAuth tokens are NOT stored on backend; frontend passes access token as bearer
      if (auth.oauth?.configId) {
        console.warn('OAuth authentication detected but tokens should be managed client-side');
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
