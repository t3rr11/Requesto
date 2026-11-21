export type UrlParamRow = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

const PROTOCOL_PATTERN = /^https?:\/\//;
const RELATIVE_PATH_PATTERN = /^(?:https?:\/\/)?[^/]*(\/[^?#]*)?/;

/**
 * Extract a pathname from a URL string, handling variable placeholders like {{baseUrl}}.
 */
export function extractPathnameFromUrl(url: string): string {
  try {
    const trimmed = url.trim();
    if (!trimmed) return '/';

    if (PROTOCOL_PATTERN.test(trimmed)) {
      return new URL(trimmed).pathname;
    }

    const match = RELATIVE_PATH_PATTERN.exec(trimmed);
    return match?.[1] || trimmed || '/';
  } catch {
    const match = RELATIVE_PATH_PATTERN.exec(url);
    return match?.[1] || url || '/';
  }
}

/**
 * Extract query parameters from a URL and return the base URL + params array.
 * The base URL is everything before the first `?`, kept exactly as written
 * (including variable placeholders and fragments).
 */
export function extractParamsFromUrl(url: string): {
  baseUrl: string;
  params: { key: string; value: string }[];
} {
  try {
    const urlObj = /^https?:\/\//i.test(url) ? new URL(url) : new URL(url, 'https://dummy');

    const params: { key: string; value: string }[] = [];
    urlObj.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });

    return { baseUrl: url.split('?')[0], params };
  } catch {
    return { baseUrl: url, params: [] };
  }
}

/** Generate a unique id for a param row (safe in both browser and test environments). */
function createParamRowId(): string {
  return `param-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A fresh, enabled row with empty key/value — the placeholder for the next param. */
function createEmptyParamRow(): UrlParamRow {
  return { id: createParamRowId(), key: '', value: '', enabled: true };
}

/** An enabled row with an empty key acts as the placeholder for the next param. */
function isPlaceholderRow(row: UrlParamRow): boolean {
  return row.enabled && row.key.trim() === '';
}

/**
 * Escape characters that would change how a query string parses when a param
 * row value is written back into the URL (e.g. `&` splitting pairs, `#`
 * starting a fragment, `+` decoding as a space).
 */
function escapeQueryValue(value: string): string {
  return value.replace(/[&+#%]/g, char => encodeURIComponent(char));
}

/**
 * Escape a query param key. Keys additionally escape `=` and `?` because they
 * would otherwise split the pair or the query string itself.
 */
function escapeQueryKey(key: string): string {
  return key.replace(/[&=#?+%]/g, char => encodeURIComponent(char));
}

/**
 * Replace the query string of a URL with the enabled param rows, keeping
 * everything before the `?` (and any `#fragment`) exactly as the user wrote it.
 * Disabled rows and rows with empty keys are excluded from the query string.
 */
export function setUrlQueryParams(url: string, params: UrlParamRow[]): string {
  const hashIndex = url.indexOf('#');
  const beforeFragment = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex);
  const base = beforeFragment.split('?')[0];

  const enabledParams = params.filter(p => p.enabled && p.key.trim());
  if (enabledParams.length === 0) {
    return `${base}${fragment}`;
  }

  const queryString = enabledParams
    .map(p => `${escapeQueryKey(p.key)}=${escapeQueryValue(p.value)}`)
    .join('&');
  return `${base}?${queryString}${fragment}`;
}

/**
 * Merge the query params parsed from a URL into the existing param rows.
 *
 * Used while the user types in the URL field so the Params table mirrors the
 * URL's query string at all times:
 *  - rows matching a parsed key keep their id and are updated + enabled
 *  - parsed keys without a matching row take over the placeholder row when
 *    one exists (so the first typed param becomes the first row), otherwise
 *    a new row is appended
 *  - enabled rows whose key no longer appears in the URL are removed
 *  - disabled rows are preserved untouched
 *  - the result always ends with exactly one empty placeholder row, so the
 *    live table matches the state after reopening the request
 */
export function mergeParamsFromUrl(url: string, existing: UrlParamRow[]): UrlParamRow[] {
  const { params } = extractParamsFromUrl(url);
  const rows = existing.map(row => ({ ...row }));
  const matchedRowIds = new Set<string>();
  const parsedKeys = new Set<string>();

  for (const param of params) {
    parsedKeys.add(param.key);
    const match = rows.find(row => !matchedRowIds.has(row.id) && row.key === param.key);
    if (match) {
      match.value = param.value;
      match.enabled = true;
      matchedRowIds.add(match.id);
    } else {
      const placeholder = rows.find(
        row => !matchedRowIds.has(row.id) && isPlaceholderRow(row) && row.value === ''
      );
      if (placeholder) {
        placeholder.key = param.key;
        placeholder.value = param.value;
        matchedRowIds.add(placeholder.id);
      } else {
        rows.push({ id: createParamRowId(), key: param.key, value: param.value, enabled: true });
      }
    }
  }

  // Enabled rows with keys that were removed from the URL no longer belong in the table.
  const kept = rows.filter(row => !row.enabled || row.key.trim() === '' || parsedKeys.has(row.key));

  // Exactly one trailing placeholder row keeps the table ready for the next
  // param and consistent with the table shown when the request is reopened.
  const keyedRows = kept.filter(row => !isPlaceholderRow(row));
  const placeholder = kept.find(isPlaceholderRow);
  return [...keyedRows, placeholder ?? createEmptyParamRow()];
}
