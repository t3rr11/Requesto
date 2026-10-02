export type MockContentType = 'json' | 'xml' | 'html' | 'text';
export type MockMode = 'static' | 'dynamic';
export type MockHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type MockStaticResponse = {
  status: number;
  headers: Record<string, string>;
  contentType: MockContentType;
  body: string;
  delayMs: number;
};

/**
 * Static mode serves one hand-written response per configured method; dynamic
 * mode serves full CRUD against the endpoint's dataset, covering every method.
 */
export type MockEndpoint = {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  mode: MockMode;
  methods: Partial<Record<MockHttpMethod, MockStaticResponse>>;
};

export type NewMockEndpointInput = {
  name: string;
  path: string;
  mode?: MockMode;
};

export type MockRequestLogEntry = {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  endpointName: string | null;
  durationMs: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
};

export type MockServerStatus = {
  running: boolean;
  port: number;
  url: string | null;
};

export type MockDatasetCounts = Record<string, number>;
