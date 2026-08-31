import { CliError } from './cli-error.js';

/** HTTP failure with the status code attached, for precise handling upstream. */
class IsolationHttpError extends CliError {
  constructor(
    readonly status: number,
    method: string,
    path: string,
    detail: string,
  ) {
    super(`${method} ${path} failed with ${status}${detail ? `: ${detail}` : ''}`);
  }
}

/**
 * Runs a suite in an isolated server-side workspace: a scratch workspace is
 * created and activated on the target Requesto server for the duration of
 * the run, and the original workspace is restored and the scratch removed
 * afterwards — so collections, environments and workspaces created or
 * deleted by the suite never touch the workspace the application is using.
 */
export class WorkspaceIsolation {
  private readonly serverUrl: string;
  private originalWorkspaceId: string | null = null;
  private scratchWorkspaceId: string | null = null;
  private scratchWorkspaceName: string;

  constructor(opts: { serverUrl: string }) {
    this.serverUrl = opts.serverUrl.replace(/\/+$/, '');
    this.scratchWorkspaceName = `requesto-run-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  }

  /** Capture the active workspace, create and activate a scratch workspace. */
  async setup(): Promise<void> {
    let active: { id?: string } | null;
    let created: { id?: string } | null;
    try {
      // The server may have no active workspace (404) — isolation still
      // works, there is just nothing to restore afterwards.
      active = await this.tryRequest('GET', '/api/workspaces/active');
      this.originalWorkspaceId = active?.id ?? null;

      // The scratch workspace inherits the source workspace's environments
      // and OAuth configurations so requests resolve variables and
      // authenticate exactly as they would outside the run.
      created = await this.request('POST', '/api/workspaces', {
        name: this.scratchWorkspaceName,
        ...(this.originalWorkspaceId ? { copyFrom: this.originalWorkspaceId } : {}),
      });
    } catch (err) {
      if (err instanceof IsolationHttpError) throw err;
      throw new CliError(
        `Isolation failed: could not reach the Requesto server at ${this.serverUrl}. Is it running? ` +
          `(Run without --isolated to execute against the active workspace without scratch-workspace protection.)`,
      );
    }
    if (!created?.id) {
      throw new CliError(`Isolation failed: server did not return a workspace id (POST ${this.serverUrl}/api/workspaces)`);
    }
    this.scratchWorkspaceId = created.id;

    await this.request('POST', `/api/workspaces/${created.id}/activate`, {});
  }

  /**
   * Restore the previously-active workspace and delete the scratch one.
   * Both steps run even if the other fails; all problems are reported.
   */
  async teardown(): Promise<void> {
    const errors: string[] = [];

    if (this.originalWorkspaceId) {
      try {
        await this.request('POST', `/api/workspaces/${this.originalWorkspaceId}/activate`, {});
      } catch (err) {
        errors.push(`restoring workspace ${this.originalWorkspaceId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (this.scratchWorkspaceId) {
      try {
        await this.request('DELETE', `/api/workspaces/${this.scratchWorkspaceId}`);
      } catch (err) {
        errors.push(`deleting scratch workspace ${this.scratchWorkspaceId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Isolation teardown problems: ${errors.join('; ')}`);
    }
  }

  /** Server URL the isolation manager operates against (for messages). */
  get target(): string {
    return this.serverUrl;
  }

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    const res = await fetch(`${this.serverUrl}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new IsolationHttpError(res.status, method, path, detail.slice(0, 300));
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  /** Like request, but returns null instead of throwing on 404. */
  private async tryRequest(method: string, path: string): Promise<any> {
    try {
      return await this.request(method, path);
    } catch (err) {
      if (err instanceof IsolationHttpError && err.status === 404) return null;
      throw err;
    }
  }
}
