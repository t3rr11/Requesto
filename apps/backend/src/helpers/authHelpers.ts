import { AuthConfig } from '../types';

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
          const urlObj = new URL(updatedUrl);
          urlObj.searchParams.set(auth.apiKey.key, auth.apiKey.value);
          updatedUrl = urlObj.toString();
        }
      }
      break;

    case 'digest':
      // EXPLAIN: Digest auth handled by axios via getAxiosAuthConfig()
      break;

    case 'oauth':
      // GOTCHA: OAuth tokens are NOT stored on backend - frontend passes access token as bearer token
      if (auth.oauth?.configId) {
        console.warn('OAuth authentication detected but tokens should be managed client-side');
      }
      break;
  }

  return { headers: updatedHeaders, url: updatedUrl };
}

export function requiresSpecialAuthHandling(auth: AuthConfig | undefined): boolean {
  return auth?.type === 'digest';
}

export function getAxiosAuthConfig(auth: AuthConfig | undefined) {
  if (auth?.type === 'digest' && auth.digest) {
    return {
      username: auth.digest.username,
      password: auth.digest.password,
    };
  }
  return undefined;
}
