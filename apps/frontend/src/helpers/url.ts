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
