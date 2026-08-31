import fs from 'node:fs';
import path from 'node:path';
import { CollectionRepository } from 'requesto-backend/repositories/collection.repository';
import { EnvironmentRepository } from 'requesto-backend/repositories/environment.repository';
import { EnvironmentLocalRepository } from 'requesto-backend/repositories/environment-local.repository';
import { HistoryRepository } from 'requesto-backend/repositories/history.repository';
import { EnvironmentService } from 'requesto-backend/services/environment.service';
import { HistoryService } from 'requesto-backend/services/history.service';
import { OAuthService } from 'requesto-backend/services/oauth.service';
import { ProxyService } from 'requesto-backend/services/proxy.service';
import type { OAuthTokenResolver } from 'requesto-backend/utils/auth';
import type { Collection } from './types.ts';
import type { Environment, EnvironmentsData } from './types.ts';
import { CliError } from './cli-error.ts';
import { CliOAuthRepository, type CliRepoOptions } from './auth.ts';

export type WorkspaceOptions = CliRepoOptions;

/**
 * A loaded `.requesto` workspace wired to the backend engine
 * (repositories → services → ProxyService), ready to execute requests.
 *
 * The workspace is treated as read-only by default: OAuth tokens acquired
 * during the run are held in memory, request history is not written and
 * environment "current values" live only for the duration of the run.
 */
export class CliWorkspace {
  readonly dataDir: string;
  readonly localDir: string;
  readonly oauthRepo: CliOAuthRepository;
  readonly oauthService: OAuthService;
  readonly proxyService: ProxyService;

  private readonly collectionRepo: CollectionRepository;
  private readonly envService: EnvironmentService;

  constructor(dataDir: string, opts: WorkspaceOptions) {
    this.dataDir = dataDir;
    this.localDir = path.join(dataDir, 'local');

    const getDataDir = () => dataDir;
    const getLocalDir = () => this.localDir;

    this.collectionRepo = new CollectionRepository(getDataDir);
    const envRepo = new EnvironmentRepository(getDataDir, getLocalDir);
    const envLocalRepo = new EnvironmentLocalRepository(getLocalDir);
    this.oauthRepo = new CliOAuthRepository(getDataDir, getLocalDir, opts);
    const historyRepo = new HistoryRepository(getLocalDir);

    this.envService = new EnvironmentService(envRepo, envLocalRepo);
    this.oauthService = new OAuthService(this.oauthRepo);
    this.proxyService = new ProxyService(this.envService, new HistoryService(historyRepo), this.oauthService);
  }

  /** All collections in workspace order. */
  async getCollections(): Promise<Collection[]> {
    return this.collectionRepo.getAll();
  }

  /** All environments (with local current values merged, like the client). */
  getEnvironments(): EnvironmentsData {
    return this.envService.getAll();
  }

  /**
   * Resolve the environment to run with:
   *  - a selector matches by name (case-insensitive) or id;
   *  - no selector → the workspace's active environment (falls back to the
   *    first environment in workspace order, like the client);
   *  - 'none' → no environment.
   */
  resolveEnvironment(selector: string | undefined): Environment | null {
    if (selector === 'none') return null;
    const data = this.getEnvironments();

    if (!selector) {
      return data.environments.find((e) => e.id === data.activeEnvironmentId) ?? null;
    }

    const byName = data.environments.find((e) => e.name.toLowerCase() === selector.toLowerCase());
    if (byName) return byName;
    const byId = data.environments.find((e) => e.id === selector);
    if (byId) return byId;

    const available = data.environments.map((e) => e.name || e.id).join(', ');
    throw new CliError(
      available
        ? `Environment "${selector}" not found. Available: ${available} (or "none").`
        : `Environment "${selector}" not found — this workspace has no environments (use "none" or define one).`,
    );
  }

  /** Send a request through the backend engine with the given per-run options. */
  sendRequest(
    request: Parameters<ProxyService['executeRequest']>[0],
    opts: { oauthResolver: OAuthTokenResolver; timeout?: number },
  ): ReturnType<ProxyService['executeRequest']> {
    return this.proxyService.executeRequest(request, {
      // The CLI substitutes variables itself against the live environment,
      // so disable workspace-level substitution here.
      environment: null,
      oauthResolver: opts.oauthResolver,
      timeout: opts.timeout,
      saveHistory: false,
    });
  }
}

/**
 * Locate the `.requesto` directory. Accepts the workspace directory itself or
 * any directory inside a workspace tree — the search walks up parent
 * directories until a `.requesto` folder is found (so running from a repo
 * subdirectory just works).
 */
export function resolveWorkspacePath(input: string | undefined): string {
  const start = path.resolve(input ?? process.cwd());

  if (path.basename(start) === '.requesto' && fs.existsSync(start) && fs.statSync(start).isDirectory()) {
    return start;
  }

  let current = start;
  while (true) {
    const candidate = path.join(current, '.requesto');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new CliError(
    `No .requesto workspace found at or above "${start}". Pass the path to your repository (containing .requesto) or to the .requesto directory itself.`,
  );
}
