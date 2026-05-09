import type { ProxyResponse } from '../store/request/types';

export function formatResponseBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function getStatusBadgeColor(status: number): string {
  if (status >= 200 && status < 300)
    return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
  if (status >= 300 && status < 400)
    return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  if (status >= 400 && status < 500)
    return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';
  return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/** Case-insensitive header lookup. */
export function getHeaderCI(headers: Record<string, string> | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target) return v;
  }
  return undefined;
}

/** Returns the bare media type (no parameters) from the content-type header. */
export function getResponseContentType(headers: Record<string, string> | undefined): string | undefined {
  const ct = getHeaderCI(headers, 'content-type');
  if (!ct) return undefined;
  const bare = ct.split(';')[0].trim();
  return bare || undefined;
}

/** Returns true for text-based content types (text/*, application/json, xml, yaml, etc). Missing/empty defaults to true. */
export function isTextContentType(contentType: string | undefined): boolean {
  if (!contentType) return true;
  const ct = contentType.split(';')[0].trim().toLowerCase();
  if (!ct) return true;
  if (ct.startsWith('text/')) return true;
  if (ct.endsWith('+json') || ct.endsWith('+xml') || ct.endsWith('+yaml')) return true;
  const textApplicationTypes = new Set([
    'application/json',
    'application/xml',
    'application/javascript',
    'application/ecmascript',
    'application/x-www-form-urlencoded',
    'application/graphql',
    'application/ld+json',
    'application/yaml',
    'application/x-yaml',
  ]);
  return textApplicationTypes.has(ct);
}

/** Extracts the charset from a Content-Type header, defaulting to 'utf-8'. */
export function parseCharset(contentType: string | undefined): string {
  if (!contentType) return 'utf-8';
  const match = contentType.match(/charset\s*=\s*"?([^";]+)"?/i);
  if (!match) return 'utf-8';
  return match[1].trim().toLowerCase();
}

/** Base64-encodes a Uint8Array using chunked String.fromCharCode to avoid stack overflow on large payloads. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Parses a Content-Disposition header and returns the filename, or null.
 * Prefers filename* (RFC 5987, supports Unicode) over plain filename=.
 * Path separators are stripped to prevent directory traversal.
 */
export function parseContentDispositionFilename(value: string | undefined): string | null {
  if (!value) return null;

  // RFC 5987 (filename*) takes priority over plain filename= as it supports Unicode.
  const extMatch = value.match(/filename\*\s*=\s*([^']+)'[^']*'([^;]+)/i);
  if (extMatch) {
    const charset = extMatch[1].toLowerCase();
    const encoded = extMatch[2].trim().replace(/^"|"$/g, '');
    try {
      const decoded = charset === 'utf-8' || charset === 'utf8'
        ? decodeURIComponent(encoded)
        : encoded;
      const cleaned = sanitizeFilename(decoded);
      if (cleaned) return cleaned;
    } catch {
      // malformed percent-encoding - fall through
    }
  }

  const plainMatch = value.match(/(?:^|;)\s*filename\s*=\s*("([^"]*)"|([^;]+))/i);
  if (plainMatch) {
    const raw = (plainMatch[2] ?? plainMatch[3] ?? '').trim();
    const cleaned = sanitizeFilename(raw);
    if (cleaned) return cleaned;
  }

  return null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/]/g, '_').trim();
}

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'application/json': 'json',
  'application/ld+json': 'json',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'application/javascript': 'js',
  'application/ecmascript': 'js',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/gzip': 'gz',
  'application/octet-stream': 'bin',
  'application/x-www-form-urlencoded': 'txt',
  'application/yaml': 'yaml',
  'application/x-yaml': 'yaml',
  'text/plain': 'txt',
  'text/html': 'html',
  'text/css': 'css',
  'text/csv': 'csv',
  'text/markdown': 'md',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'video/mp4': 'mp4',
};

/** Maps a Content-Type to a file extension. Falls back to 'bin' for unknown types. */
export function extensionForContentType(contentType: string | undefined): string {
  if (!contentType) return 'bin';
  const bare = contentType.split(';')[0].trim().toLowerCase();
  if (!bare) return 'bin';
  if (CONTENT_TYPE_EXTENSIONS[bare]) return CONTENT_TYPE_EXTENSIONS[bare];
  if (bare.endsWith('+json')) return 'json';
  if (bare.endsWith('+xml')) return 'xml';
  if (bare.endsWith('+yaml')) return 'yaml';
  if (bare.startsWith('text/')) return 'txt';
  return 'bin';
}

function timestampSlug(now: Date = new Date()): string {
  const pad = (n: number, w = 2): string => String(n).padStart(w, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

/** Extracts a filename from the last path segment of a URL (only when the segment contains a dot). */
function filenameFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split('/').filter(Boolean).pop();
    if (last && last.includes('.')) {
      try {
        return sanitizeFilename(decodeURIComponent(last));
      } catch {
        return sanitizeFilename(last);
      }
    }
  } catch {
    // Not an absolute URL — treat as a path
    const last = url.split('?')[0].split('/').filter(Boolean).pop();
    if (last && last.includes('.')) {
      try {
        return sanitizeFilename(decodeURIComponent(last));
      } catch {
        return sanitizeFilename(last);
      }
    }
  }
  return null;
}

/** Returns a filename for the download: Content-Disposition -> URL path segment -> timestamped fallback. */
export function getDownloadFilename(response: ProxyResponse, requestUrl?: string, now: Date = new Date()): string {
  const fromDisposition = parseContentDispositionFilename(getHeaderCI(response.headers, 'content-disposition'));
  if (fromDisposition) return fromDisposition;

  if (requestUrl) {
    const fromUrl = filenameFromUrl(requestUrl);
    if (fromUrl) return fromUrl;
  }

  const ext = extensionForContentType(getHeaderCI(response.headers, 'content-type'));
  return `response-${timestampSlug(now)}.${ext}`;
}

/** Converts the response body to a Blob, decoding base64 for binary responses. */
export function decodeResponseBodyToBlob(response: ProxyResponse): Blob {
  const mimeType = getResponseContentType(response.headers) ?? 'application/octet-stream';

  if (response.bodyEncoding === 'base64') {
    const binary = atob(response.body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  return new Blob([response.body], { type: mimeType });
}

/** Triggers a browser file download for the response body. */
export function downloadResponseBody(response: ProxyResponse, requestUrl?: string): void {
  const blob = decodeResponseBodyToBlob(response);
  const filename = getDownloadFilename(response, requestUrl);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
