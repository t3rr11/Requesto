import { API_BASE } from '../api/config';
import { ScratchWorkspaceIsolation } from 'requesto-engine/runner';

export type RunnerIsolation = {
  /** Capture the active workspace, then create and activate a scratch workspace. */
  setup(): Promise<void>;
  /** Restore the previously active workspace and delete the scratch one. */
  teardown(): Promise<void>;
};

/**
 * Server-side workspace isolation for collection runs: the run operates in a
 * scratch workspace created for its duration, so collections, environments
 * and workspaces created or deleted by the run never touch the workspace the
 * user is working in.
 *
 * The scratch-workspace protocol lives in the shared engine; this adapter
 * points it at the app's own backend.
 */
export function createRunnerIsolation(): RunnerIsolation {
  const serverRoot = API_BASE.replace(/\/api$/, '');
  const isolation = new ScratchWorkspaceIsolation({ serverUrl: serverRoot });
  return {
    setup: () => isolation.setup(),
    teardown: () => isolation.teardown(),
  };
}
