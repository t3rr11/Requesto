/**
 * JWT decoding for the OAuth token viewer. Decodes the payload without
 * signature verification — display-only debugging, never a trust check.
 */

function base64UrlDecode(segment: string): string | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    // Decode UTF-8 bytes correctly (atob yields a binary string).
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Decodes the payload claims of a JWT string. Returns null for opaque
 * tokens, non-JWT strings, or payloads that are not JSON objects.
 */
export function decodeJwtPayload(token: string | undefined | null): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart] = parts;
  if (!headerPart || !payloadPart) return null;

  const header = base64UrlDecode(headerPart);
  if (!header) return null;
  let headerJson: unknown;
  try {
    headerJson = JSON.parse(header);
  } catch {
    return null;
  }
  if (!headerJson || typeof headerJson !== 'object' || Array.isArray(headerJson)) return null;

  const payload = base64UrlDecode(payloadPart);
  if (!payload) return null;
  let payloadJson: unknown;
  try {
    payloadJson = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!payloadJson || typeof payloadJson !== 'object' || Array.isArray(payloadJson)) return null;
  return payloadJson as Record<string, unknown>;
}

/** Claims most useful for debugging token contents, in display order. */
const HIGH_SIGNAL_CLAIMS = ['exp', 'iat', 'nbf', 'iss', 'aud', 'sub', 'scope', 'scp', 'roles', 'groups', 'permissions'];

/** High-signal claims first (priority order), everything else alphabetically. */
export function orderJwtClaims(payload: Record<string, unknown>): Array<[string, unknown]> {
  const entries = Object.entries(payload);
  const priority: Array<[string, unknown]> = [];
  const rest: Array<[string, unknown]> = [];
  for (const entry of entries) {
    (HIGH_SIGNAL_CLAIMS.includes(entry[0]) ? priority : rest).push(entry);
  }
  priority.sort((a, b) => HIGH_SIGNAL_CLAIMS.indexOf(a[0]) - HIGH_SIGNAL_CLAIMS.indexOf(b[0]));
  rest.sort(([a], [b]) => a.localeCompare(b));
  return [...priority, ...rest];
}
