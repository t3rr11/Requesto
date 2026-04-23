/**
 * Pure decision: should we surface a "Backend Crashed" dialog when the
 * backend child process exits?
 *
 * Context: users reported a false-positive crash dialog appearing during
 * normal operation. The exit listener was firing on transient exits (e.g.
 * a duplicate spawned process exiting) even though the actual server was
 * still up and serving requests. The fix is two-pronged:
 *   1. Track whether the backend ever became ready (`backendReady`).
 *   2. If it was ready, re-check health before declaring a crash. Only
 *      pop the dialog if the health check fails — meaning the server is
 *      genuinely down.
 *
 * Pre-ready exits (code != 0) are still treated as real startup failures.
 */
export type BackendExitDecisionInput = {
  exitCode: number | null;
  isQuitting: boolean;
  backendReady: boolean;
  /** Result of a fresh /health probe; required only when backendReady is true. */
  healthCheckOk?: boolean;
};

export function shouldShowBackendCrashDialog(input: BackendExitDecisionInput): boolean {
  if (input.isQuitting) return false;
  if (input.exitCode === null || input.exitCode === 0) return false;

  // Pre-ready hard-failure exit — real startup crash.
  if (!input.backendReady) return true;

  // Was ready: only flag if a fresh health probe confirms the server is down.
  return input.healthCheckOk === false;
}
