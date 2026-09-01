export type {
  Collection,
  Environment,
  EnvironmentsData,
  Folder,
  ProxyRequest,
  ProxyResponse,
  RequestStatus,
  RunRequestResult,
  RunSummary,
  RunnerEvent,
  SavedRequest,
  TestResult,
} from 'requesto-engine';
import type { RunSummary } from 'requesto-engine';

export type ReporterMode = 'default' | 'verbose' | 'dot';

/** A parsed --reporter flag value. */
export type ReporterSpec =
  | { type: 'console'; mode: ReporterMode }
  | { type: 'junit'; file: string }
  | { type: 'json'; file: string };

/** Result of a full `requesto run` invocation. */
export type RunResult = {
  summary: RunSummary;
  workspacePath: string;
  environmentName: string | null;
  /** Scratch server used by the run, when one was needed. */
  serverUrl: string | null;
};
