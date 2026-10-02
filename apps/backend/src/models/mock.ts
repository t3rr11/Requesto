/**
 * Mock server feature models.
 *
 * Endpoint definitions are workspace data (versionable, one file per endpoint),
 * while dynamic datasets created through mock requests live in the gitignored
 * local sidecar so mutated test data never reaches version control.
 */

/** HTTP methods a mock endpoint can serve. */
export type MockHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** All mock HTTP methods, in stable order. */
export const MOCK_HTTP_METHODS: MockHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** Supported response body content types, driving both serving and editor highlighting. */
export type MockContentType = 'json' | 'xml' | 'html' | 'text';

/** All mock content types, in stable order. */
export const MOCK_CONTENT_TYPES: MockContentType[] = ['json', 'xml', 'html', 'text'];

/** How an endpoint produces its responses. */
export type MockMode = 'static' | 'dynamic';

/** A hand-written response used when the endpoint is in static mode. */
export interface MockStaticResponse {
  status: number;
  headers: Record<string, string>;
  contentType: MockContentType;
  body: string;
  delayMs: number;
}

/** A single dynamic-mode data record; mocking treats `id` as the lookup key. */
export type MockDatasetRecord = Record<string, unknown>;

/**
 * A user-defined mock endpoint. Paths support `:param` segments, e.g.
 * `/api/users/:id`. Static mode serves one hand-written response per configured
 * method; dynamic mode serves full CRUD against the endpoint's dataset, always
 * covering every method.
 */
export interface MockEndpoint {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  mode: MockMode;
  methods: Partial<Record<MockHttpMethod, MockStaticResponse>>;
}

/** Metadata about a request the mock server received (ring-buffer entry). */
export interface MockRequestLogEntry {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  endpointName: string | null;
  durationMs: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
}

export interface MockServerStatus {
  running: boolean;
  port: number;
  url: string | null;
}

/** Persisted local state for the mock server (gitignored). */
export interface MockServerState {
  running: boolean;
  port: number;
}
