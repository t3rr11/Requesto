/**
 * Extract a pathname from a URL or path string, preserving variables like {{baseUrl}}
 * Used for generating request names
 */
export function extractPathnameFromUrl(url: string): string {
  try {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return '/';

    // Check if it's a full URL with protocol
    if (trimmedUrl.match(/^https?:\/\//)) {
      const urlObj = new URL(trimmedUrl);
      return urlObj.pathname;
    }

    // Extract path from URL without protocol or just path
    const pathMatch = trimmedUrl.match(/^(?:https?:\/\/)?[^/]*(\/[^?#]*)?/);
    return pathMatch?.[1] || trimmedUrl || '/';
  } catch {
    // If URL parsing fails, try to extract just the path
    const pathMatch = url.match(/^(?:https?:\/\/)?[^/]*(\/[^?#]*)?/);
    return pathMatch?.[1] || url || '/';
  }
}

/**
 * Extract query parameters from URL and return both the base URL and params
 */
export function extractParamsFromUrl(url: string): { baseUrl: string; params: { key: string; value: string }[] } {
  try {
    // Check if URL has a protocol, if not, try to parse as a relative URL
    let urlObj: URL;
    if (url.match(/^https?:\/\//i)) {
      urlObj = new URL(url);
    } else {
      // For relative URLs or URLs without protocol, add a dummy base
      urlObj = new URL(url, 'http://dummy');
    }

    const params: { key: string; value: string }[] = [];
    urlObj.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });

    // Build base URL without query params
    const baseUrl = url.split('?')[0];

    return { baseUrl, params };
  } catch {
    // If URL parsing fails, return as-is
    return { baseUrl: url, params: [] };
  }
}
