// Shared types — mirror the exact shapes Requesto stores in .requesto/*.json

export type BodyType = 'json' | 'form-data' | 'x-www-form-urlencoded';
export type RequestType = 'http' | 'graphql';

export interface FormDataEntry {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';
  fileName?: string;
  fileContent?: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'api-key' | 'digest' | 'oauth';
  basic?: { username: string; password: string };
  bearer?: { token: string };
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
  digest?: { username: string; password: string };
  oauth?: { configId: string };
}

export interface GraphQLRequestConfig {
  document: string;
  variables: string;
  operationName?: string;
  transport: 'post' | 'get';
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  collectionId: string;
}

export interface SavedRequest {
  id: string;
  name: string;
  requestType?: RequestType;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: BodyType;
  formDataEntries?: FormDataEntry[];
  auth?: AuthConfig;
  collectionId: string;
  folderId?: string;
  order?: number;
  preRequestScript?: string;
  testScript?: string;
  graphql?: GraphQLRequestConfig;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  folders: Folder[];
  requests: SavedRequest[];
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  currentValue?: string;
  enabled: boolean;
  isSecret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface EnvironmentsData {
  activeEnvironmentId: string | null;
  environments: Environment[];
}

export interface OAuthToken {
  accessToken: string;
  tokenType: string;
  expiresAt?: number;
}

export interface ServerConfig {
  command: string;
  url: string;
  health?: string;
  startupTimeout?: number;
  pollInterval?: number;
}

export interface RunnerConfig {
  collection?: string;
  server?: ServerConfig;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface RequestRunResult {
  request: SavedRequest;
  folderPath: string[];
  status?: number;
  statusText?: string;
  duration?: number;
  body?: string;
  bodyEncoding?: 'utf8' | 'base64';
  testResults: TestResult[];
  error?: string;
}

export interface RunSummary {
  collectionName: string;
  passed: number;
  failed: number;
  total: number;
  durationMs: number;
  results: RequestRunResult[];
}
