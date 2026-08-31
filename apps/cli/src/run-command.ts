import fs from 'node:fs';
import { createTokenResolver } from './auth.ts';
import { CliError } from './cli-error.ts';
import { runCollections } from './engine/runner.ts';
import { WorkspaceIsolation } from './isolation.ts';
import { collectEnvVars, applyVarOverrides, normalizeKey, parseEnvFile, parseKeyValuePairs } from './vars.ts';
import { resolveWorkspacePath, CliWorkspace } from './workspace.ts';
import type { RunSummary, RunnerEvent } from './types.ts';

export type RunOptions = {
  /** Path to the repository or the .requesto directory. Defaults to cwd. */
  path?: string;
  /** Collection name/id selectors (repeatable). Default: all collections. */
  collections?: string[];
  /** Folder name/id selectors within the selected collections (repeatable). */
  folders?: string[];
  /** Environment name/id, or "none". Default: the workspace's active environment. */
  environment?: string;
  /** key=value variable overrides (repeatable). Highest precedence. */
  vars?: string[];
  /** Path to a .env file providing variable overrides. */
  varFile?: string;
  /** configId=accessToken overrides for OAuth-protected requests (repeatable). */
  tokens?: string[];
  /** configId=clientSecret injections for non-interactive OAuth flows (repeatable). */
  oauthSecrets?: string[];
  /** configId=refreshToken seeds for refreshing without a browser (repeatable). */
  refreshTokens?: string[];
  /** Stop after the first failed/errored request. */
  bail?: boolean;
  /** Skip TLS certificate verification. */
  insecure?: boolean;
  /** Per-request timeout in ms. */
  timeout?: number;
  /** Persist OAuth tokens acquired during the run back to .requesto/local/. */
  persist?: boolean;
  /**
   * Run in an isolated server-side workspace on the Requesto server at the
   * given URL: a scratch workspace is created and activated for the run and
   * removed afterwards, restoring the previously active workspace. Requires
   * the target to be a running Requesto backend.
   */
  isolated?: string;
  /** Progress callback for streaming reporters (see RunnerEvent). */
  onEvent?: (event: RunnerEvent) => void;
};

export type RunResult = {
  summary: RunSummary;
  workspacePath: string;
  environmentName: string | null;
};

/**
 * Execute the `requesto run` command. Resolves the workspace, merges
 * variable/auth overrides from flags and environment variables, runs the
 * collections through the backend engine and returns the summary.
 *
 * Exit-code convention (implemented by the caller):
 *  0 = all passed · 1 = failures/errors · 2 = configuration error (CliError)
 */
export async function runCommand(opts: RunOptions): Promise<RunResult> {
  const started = Date.now();

  // 1. Workspace
  const workspacePath = resolveWorkspacePath(opts.path);
  const oauthSecrets = mergeNormalised(
    parseKeyValuePairs(opts.oauthSecrets),
    collectEnvVars('REQUESTO_OAUTH_SECRET_'),
  );
  const refreshTokens = mergeNormalised(
    parseKeyValuePairs(opts.refreshTokens),
    collectEnvVars('REQUESTO_REFRESH_TOKEN_'),
  );
  const workspace = new CliWorkspace(workspacePath, {
    injectedSecrets: oauthSecrets,
    seededRefreshTokens: refreshTokens,
    persistTokens: opts.persist ?? false,
  });

  // Seed refresh tokens so interactive-flow configs can mint tokens headlessly.
  for (const [configId, refreshToken] of refreshTokens) {
    workspace.oauthRepo.seedRefreshToken(configId, refreshToken);
  }

  // 2. Collections
  const allCollections = await workspace.getCollections();
  if (allCollections.length === 0) {
    throw new CliError('This workspace contains no collections.');
  }
  const collections = selectCollections(allCollections, opts.collections ?? []);

  // 3. Environment + variables
  // Precedence (highest last): REQUESTO_VAR_* env vars → --var-file → --var.
  const environment = workspace.resolveEnvironment(opts.environment);
  const varOverrides = mergeRaw(
    envVarOverrides(),
    parseEnvFileVarFile(opts.varFile),
    parseKeyValuePairs(opts.vars),
  );
  const effectiveEnv = applyVarOverrides(environment, varOverrides);

  // 4. Token overrides
  const tokenOverrides = mergeNormalised(
    parseKeyValuePairs(opts.tokens),
    collectEnvVars('REQUESTO_TOKEN_'),
  );
  const oauthResolver = createTokenResolver(workspace.oauthService, tokenOverrides);

  // 5. Run — inside an isolated server-side workspace when requested.
  const isolation = opts.isolated ? new WorkspaceIsolation({ serverUrl: opts.isolated }) : null;
  let summary: RunSummary;
  if (isolation) {
    await isolation.setup();
    process.stderr.write(`Isolated run: using scratch workspace on ${isolation.target}\n`);
  }
  try {
    summary = await runCollections({
      collections,
      environment: effectiveEnv,
      oauthResolver,
      send: (request, ctx) => workspace.sendRequest(request, ctx),
      folders: opts.folders,
      bail: opts.bail,
      insecure: opts.insecure,
      timeout: opts.timeout,
      onEvent: opts.onEvent,
    });
  } finally {
    if (isolation) {
      try {
        await isolation.teardown();
      } catch (err) {
        process.stderr.write(`Warning: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  }

  return {
    summary: { ...summary, totalDuration: Date.now() - started },
    workspacePath,
    environmentName: effectiveEnv?.name ?? null,
  };
}

function parseEnvFileVarFile(path: string | undefined): Map<string, string> {
  if (!path) return new Map();
  if (!fs.existsSync(path)) {
    throw new CliError(`Var file not found: ${path}`);
  }
  return parseEnvFile(fs.readFileSync(path, 'utf8'));
}

/** REQUESTO_VAR_<KEY> environment variables, keyed by raw variable name casing. */
function envVarOverrides(): Map<string, string> {
  return collectEnvVars('REQUESTO_VAR_');
}

function selectCollections<T extends { id: string; name: string }>(
  collections: T[],
  selectors: string[],
): T[] {
  if (selectors.length === 0) return collections;
  const selected: T[] = [];
  for (const selector of selectors) {
    const match = collections.find(
      (c) => c.name.toLowerCase() === selector.toLowerCase() || c.id === selector,
    );
    if (!match) {
      const available = collections.map((c) => c.name).join(', ');
      throw new CliError(
        available
          ? `Collection "${selector}" not found. Available: ${available}`
          : `Collection "${selector}" not found.`,
      );
    }
    if (!selected.includes(match)) selected.push(match);
  }
  return selected;
}

/** Merge flag values over environment-variable values (flags win). */
function mergeRaw(...maps: Map<string, string>[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const map of maps) for (const [k, v] of map) out.set(k, v);
  return out;
}

/** Merge with keys normalised so REQUESTO_TOKEN_my-app matches config "my-app:auth" etc. */
function mergeNormalised(...maps: Map<string, string>[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const map of maps) {
    for (const [k, v] of map) out.set(normalizeKey(k), v);
  }
  return out;
}

/** Compute the process exit code for a run summary. */
export function computeExitCode(summary: RunSummary): number {
  return summary.failed + summary.errored > 0 ? 1 : 0;
}
