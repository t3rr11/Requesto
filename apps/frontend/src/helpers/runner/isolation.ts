import { API_BASE } from '../api/config';

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
 */
export function createRunnerIsolation(): RunnerIsolation {
  let originalWorkspaceId: string | null = null;
  let scratchWorkspaceId: string | null = null;

  async function request(method: string, path: string, body?: unknown): Promise<any> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Workspace request ${method} ${path} failed (${res.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    async setup(): Promise<void> {
      // The server may have no active workspace (404) — isolation still works.
      const activeRes = await fetch(`${API_BASE}/workspaces/active`);
      originalWorkspaceId = activeRes.ok ? ((await activeRes.json()) as { id: string }).id : null;

      // The scratch workspace inherits the source workspace's environments
      // and OAuth configurations (incl. secrets/token cache) so requests
      // resolve variables and authenticate exactly as they would outside a run.
      const scratch = await request('POST', '/workspaces', {
        name: `requesto-run-${new Date().toISOString().replace(/[:.]/g, '-')}`,
        ...(originalWorkspaceId ? { copyFrom: originalWorkspaceId } : {}),
      });
      scratchWorkspaceId = scratch.id;
      await request('POST', `/workspaces/${scratch.id}/activate`);
    },

    async teardown(): Promise<void> {
      const errors: string[] = [];

      if (originalWorkspaceId) {
        try {
          await request('POST', `/workspaces/${originalWorkspaceId}/activate`);
        } catch (err) {
          errors.push(`restoring workspace: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (scratchWorkspaceId) {
        try {
          await request('DELETE', `/workspaces/${scratchWorkspaceId}`);
        } catch (err) {
          errors.push(`deleting scratch workspace: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Isolation teardown problems: ${errors.join('; ')}`);
      }
    },
  };
}
