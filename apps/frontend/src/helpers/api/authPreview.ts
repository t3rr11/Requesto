import type { ProxyRequest } from '../../store/request/types';
import { useOAuthStore } from '../../store/oauth/store';

/**
 * Mirror of the backend's `applyAuthentication` for display purposes only.
 *
 * The backend injects auth headers/query params just before sending the
 * upstream request, so they never appear on the original `ProxyRequest`
 * object the frontend keeps. That made the Authorization header invisible
 * in the Console panel for basic / bearer / api-key / digest / oauth auth.
 *
 * This helper produces a copy of the request with the same headers / URL
 * the backend will end up sending, so we can show the user exactly what
 * was on the wire. It's never sent to the network — only used for logging.
 *
 * For OAuth we never have the real access token on the frontend (it's owned
 * by the backend); we display the redacted preview from the cached token
 * status so the console at least shows that an Authorization header will be
 * attached.
 */
export function applyAuthForDisplay(request: ProxyRequest): ProxyRequest {
  const auth = request.auth;
  if (!auth || auth.type === 'none') return request;

  const headers = { ...(request.headers ?? {}) };
  let url = request.url;

  switch (auth.type) {
    case 'basic':
      if (auth.basic) {
        const credentials = `${auth.basic.username}:${auth.basic.password}`;
        headers['Authorization'] = `Basic ${btoa(credentials)}`;
      }
      break;

    case 'bearer':
      if (auth.bearer?.token) {
        headers['Authorization'] = `Bearer ${auth.bearer.token}`;
      }
      break;

    case 'api-key':
      if (auth.apiKey?.key && auth.apiKey.value) {
        if (auth.apiKey.addTo === 'header') {
          headers[auth.apiKey.key] = auth.apiKey.value;
        } else if (auth.apiKey.addTo === 'query') {
          try {
            const u = new URL(url);
            u.searchParams.set(auth.apiKey.key, auth.apiKey.value);
            url = u.toString();
          } catch {
            // leave url untouched if not yet a valid URL
          }
        }
      }
      break;

    case 'digest':
      if (auth.digest?.username) {
        // Digest's real Authorization header is computed after a 401 challenge,
        // so we can only show the username being used.
        headers['Authorization'] = `Digest username="${auth.digest.username}"`;
      }
      break;

    case 'oauth':
      if (auth.oauth?.configId) {
        const status = useOAuthStore.getState().tokenStatuses[auth.oauth.configId];
        if (status?.hasToken && status.accessTokenPreview) {
          const tokenType = status.tokenType ?? 'Bearer';
          headers['Authorization'] = `${tokenType} ${status.accessTokenPreview}`;
        }
      }
      break;
  }

  return { ...request, headers, url };
}

