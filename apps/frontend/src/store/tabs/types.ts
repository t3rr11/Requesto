import type { AuthConfig, BodyType, FormDataEntry, ProxyResponse, StreamingResponse } from '../request/types';
import type { TestResult } from '../../helpers/scriptRunner';
import type { GraphQLRequestConfig, RequestType } from '../collections/types';

export type TabRequest = {
  requestType?: RequestType;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: BodyType;
  formDataEntries?: FormDataEntry[];
  auth?: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
  graphql?: GraphQLRequestConfig;
};

export type Tab = {
  id: string;
  label: string;
  request: TabRequest;
  response: ProxyResponse | StreamingResponse | null;
  isDirty: boolean;
  isTouched: boolean;
  isLoading: boolean;
  error: string | null;
  savedRequestId?: string;
  collectionId?: string;
  originalRequest?: TabRequest;
  lastAccessedAt: number;
  testResults?: TestResult[];
};

export type HistoryItem = {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
  headers?: Record<string, string>;
  body?: string;
};
