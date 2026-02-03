import { AuthConfig } from '../types';

/**
 * Apply authentication to request headers and URL
 * @param auth - Authentication configuration
 * @param headers - Existing request headers
 * @param url - Request URL
 * @returns Updated headers and URL with authentication applied
 */
export function applyAuthentication(
  auth: AuthConfig | undefined,
  headers: Record<string, string> = {},
  url: string
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
      if (auth.bearer && auth.bearer.token) {
        updatedHeaders['Authorization'] = `Bearer ${auth.bearer.token}`;
      }
      break;

    case 'api-key':
      if (auth.apiKey && auth.apiKey.key && auth.apiKey.value) {
        if (auth.apiKey.addTo === 'header') {
          updatedHeaders[auth.apiKey.key] = auth.apiKey.value;
        } else if (auth.apiKey.addTo === 'query') {
          // Add API key to query parameters
          const urlObj = new URL(updatedUrl);
          urlObj.searchParams.set(auth.apiKey.key, auth.apiKey.value);
          updatedUrl = urlObj.toString();
        }
      }
      break;

    case 'digest':
      // Note: Digest auth requires a challenge-response mechanism
      // For now, we'll let axios handle it via the auth config
      // This is a placeholder - axios will need special handling for digest
      if (auth.digest) {
        // Digest auth is handled differently by axios
        // We'll pass it through and handle it in the axios config
      }
      break;

    case 'oauth':
      // OAuth tokens are sent as Bearer tokens in the Authorization header
      // The frontend passes the access token directly in the auth config
      if (auth.oauth?.configId) {
        // Note: In the current architecture, tokens are NOT stored on the backend
        // The frontend must include the token in the request, typically as a bearer token
        // This case exists for compatibility but tokens should be handled client-side
        console.warn('OAuth authentication detected but tokens should be managed client-side');
      }
      break;
  }

  return { headers: updatedHeaders, url: updatedUrl };
}

/**
 * Check if auth type requires special axios configuration
 * @param auth - Authentication configuration
 * @returns True if auth requires special axios handling
 */
export function requiresSpecialAuthHandling(auth: AuthConfig | undefined): boolean {
  return auth?.type === 'digest';
}

/**
 * Get axios auth config for digest authentication
 * @param auth - Authentication configuration
 * @returns Axios auth config object or undefined
 */
export function getAxiosAuthConfig(auth: AuthConfig | undefined) {
  if (auth?.type === 'digest' && auth.digest) {
    return {
      username: auth.digest.username,
      password: auth.digest.password,
    };
  }
  return undefined;
}
