import type { AuthConfig, BodyType, FormDataEntry } from '../request/types';
import type { ProxyResponse, StreamingResponse } from '../request/types';
import type { TestResult } from '../../helpers/scriptRunner';

export type TabRequest = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: BodyType;
  formDataEntries?: FormDataEntry[];
  auth?: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
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
