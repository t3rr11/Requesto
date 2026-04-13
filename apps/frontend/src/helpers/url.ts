/**
 * Extract a pathname from a URL string, handling variable placeholders like {{baseUrl}}.
 */
export function extractPathnameFromUrl(url: string): string {
  try {
    const trimmed = url.trim();
    if (!trimmed) return '/';

    if (/^https?:\/\//.test(trimmed)) {
      return new URL(trimmed).pathname;
    }

    const match = trimmed.match(/^(?:https?:\/\/)?[^/]*(\/[^?#]*)?/);
    return match?.[1] || trimmed || '/';
  } catch {
    const match = url.match(/^(?:https?:\/\/)?[^/]*(\/[^?#]*)?/);
    return match?.[1] || url || '/';
  }
}

/**
 * Build a full URL by appending enabled query params to a base URL.
 */
export function buildUrlWithParams(
  baseUrl: string,
  params: Array<{ key: string; value: string; enabled: boolean }>,
): string {
  const enabledParams = params.filter(p => p.enabled && p.key.trim());
  if (enabledParams.length === 0) return baseUrl;

  const queryString = enabledParams.map(p => `${p.key}=${p.value}`).join('&');
  return baseUrl.includes('?') ? `${baseUrl}&${queryString}` : `${baseUrl}?${queryString}`;
}

/**
 * Extract query parameters from a URL and return the base URL + params array.
 */
export function extractParamsFromUrl(url: string): {
  baseUrl: string;
  params: { key: string; value: string }[];
} {
  try {
    const urlObj = /^https?:\/\//i.test(url) ? new URL(url) : new URL(url, 'http://dummy');

    const params: { key: string; value: string }[] = [];
    urlObj.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });

    return { baseUrl: url.split('?')[0], params };
  } catch {
    return { baseUrl: url, params: [] };
  }
}
