import type { BodyEncoding } from '../models/proxy';

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

/**
 * Encodes a response buffer for JSON transport. Text types are decoded with
 * their declared charset; binary types are base64-encoded.
 */
export function encodeResponseBody(
  buffer: Buffer,
  contentType: string | undefined,
): { body: string; bodyEncoding: BodyEncoding } {
  if (buffer.length === 0) {
    return { body: '', bodyEncoding: 'utf8' };
  }

  if (isTextContentType(contentType)) {
    const charset = parseCharset(contentType);
    const supported: BufferEncoding[] = ['utf-8', 'utf8', 'ascii', 'latin1', 'binary', 'utf16le', 'ucs-2', 'ucs2'];
    const encoding = (supported.includes(charset as BufferEncoding) ? charset : 'utf-8') as BufferEncoding;
    return { body: buffer.toString(encoding), bodyEncoding: 'utf8' };
  }

  return { body: buffer.toString('base64'), bodyEncoding: 'base64' };
}
