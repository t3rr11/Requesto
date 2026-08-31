import type { SavedRequest } from 'requesto-backend/models/collection';
import type { ProxyResponse } from 'requesto-backend/models/proxy';
import type { TestResult } from './engine/sandbox-core.ts';

export type { Collection, Folder, SavedRequest } from 'requesto-backend/models/collection';
export type { Environment, EnvironmentsData } from 'requesto-backend/models/environment';
export type { ProxyRequest, ProxyResponse } from 'requesto-backend/models/proxy';
export type { TestResult } from './engine/sandbox-core.ts';

export type RequestStatus = 'passed' | 'failed' | 'error' | 'skipped';

export type RunRequestResult = {
  collectionId: string;
  collectionName: string;
  request: SavedRequest;
  status: RequestStatus;
  response: ProxyResponse | null;
  testResults: TestResult[];
  /** Set when status is 'error'. */
  error?: string;
  /** Total request duration in ms (as reported by the engine). */
  duration?: number;
};

export type RunSummary = {
  results: RunRequestResult[];
  /** Number of requests that were actually executed (not skipped). */
  executed: number;
  passed: number;
  failed: number;
  errored: number;
  skipped: number;
  totalTests: number;
  passedTests: number;
  /** Wall-clock duration of the whole run in ms. */
  totalDuration: number;
  environmentName: string | null;
  bailTriggered: boolean;
};

export type ReporterId = 'console';

/** Progress events emitted by the runner as the run unfolds. */
export type RunnerEvent =
  | { type: 'collection-start'; collectionId: string; collectionName: string }
  | { type: 'request-start'; collectionId: string; collectionName: string; request: SavedRequest }
  | { type: 'request-end'; result: RunRequestResult };
