import type { MockContentType, MockEndpoint, MockHttpMethod, MockStaticResponse } from '../store/mock/types';
import type { KeyValueRow } from '../components/KeyValueEditor';

/** Editable header rows per configured method. */
export type MockHeaderRows = Partial<Record<MockHttpMethod, KeyValueRow[]>>;

/** Monaco language id for each mock response content type. */
export const MOCK_CONTENT_TYPE_LANGUAGES: Record<MockContentType, string> = {
  json: 'json',
  xml: 'xml',
  html: 'html',
  text: 'plaintext',
};

/** Labels shown in the content-type picker. */
export const MOCK_CONTENT_TYPE_LABELS: Record<MockContentType, string> = {
  json: 'JSON',
  xml: 'XML',
  html: 'HTML',
  text: 'Plain text',
};

/** All supported content types, in stable display order. */
export const CONTENT_TYPES = ['json', 'xml', 'html', 'text'] as const;

/** A sane starting body for each content type. */
export const MOCK_DEFAULT_BODIES: Record<MockContentType, string> = {
  json: '{\n  \n}',
  xml: '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>',
  html: '<!DOCTYPE html>\n<html>\n  <body>\n    \n  </body>\n</html>',
  text: '',
};

/** Methods a mock endpoint can configure, in stable display order. */
export const MOCK_METHOD_ORDER: MockHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** Convert persisted header records into KeyValueEditor rows (one empty row for editing). */
export function headersToRows(headers: Record<string, string> | undefined): KeyValueRow[] {
  const entries = Object.entries(headers ?? {});
  if (entries.length === 0) return [createEmptyRow()];
  return entries.map(([key, value]) => ({ id: crypto.randomUUID(), key, value, enabled: true }));
}

/** Convert editor rows back into persisted headers, dropping empty and disabled rows. */
export function rowsToHeaders(rows: KeyValueRow[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const row of rows) {
    if (row.enabled && row.key.trim()) {
      headers[row.key.trim()] = row.value;
    }
  }
  return headers;
}

function createEmptyRow(): KeyValueRow {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true };
}

/** Static response defaults used when adding a method to an endpoint. */
export function createDefaultStaticResponse(): MockStaticResponse {
  return { status: 200, headers: {}, contentType: 'json', body: '{\n  \n}', delayMs: 0 };
}

/** Build editor header rows for every configured method of an endpoint. */
export function endpointToHeaderRows(endpoint: MockEndpoint): MockHeaderRows {
  const rows: MockHeaderRows = {};
  for (const [method, staticResponse] of Object.entries(endpoint.methods)) {
    if (staticResponse) {
      rows[method as MockHttpMethod] = headersToRows(staticResponse.headers);
    }
  }
  return rows;
}

/** The method to show first: the first configured one, or GET. */
export function firstConfiguredMethod(endpoint: MockEndpoint): MockHttpMethod {
  return MOCK_METHOD_ORDER.find(method => endpoint.methods[method]) ?? 'GET';
}

/**
 * Signature of everything an endpoint save would persist (including editor
 * header rows). Dirty state is derived from it, so the indicator clears as
 * soon as the user changes a setting back to its saved value.
 */
export function endpointSignature(endpoint: MockEndpoint, headerRows: MockHeaderRows): string {
  return JSON.stringify({
    name: endpoint.name.trim(),
    path: endpoint.path,
    enabled: endpoint.enabled,
    mode: endpoint.mode,
    methods: MOCK_METHOD_ORDER.map(method => endpoint.methods[method] ?? null),
    headers: MOCK_METHOD_ORDER.map(method => rowsToHeaders(headerRows[method] ?? [])),
  });
}
