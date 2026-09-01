import fs from 'node:fs';
import { EmbeddedRequestoServer, ScratchWorkspaceIsolation, runCollections } from 'requesto-engine';
import type { Environment, RunnerEvent, RunSummary } from 'requesto-engine';
import { nodeScriptRunner } from 'requesto-engine/node-scripts';
import { createTokenResolver } from '../auth/token-resolver.ts';
import { CliError } from '../cli-error.ts';
import { collectEnvVars, applyVarOverrides, normalizeKey, parseEnvFile, parseKeyValuePairs } from '../vars.ts';
import { resolveWorkspacePath, CliWorkspace } from '../workspace/workspace.ts';
import type { RunResult } from '../types.ts';

export type RunOptions = {
  /** Path to the repository or the .requesto directory. Defaults to cwd. */
  path?: string;
  /** Collection name/id selectors (repeatable). Default: all collections. */
  collections?: string[];
  /** Folder name/id selectors within the selected collections (repeatable). */
  folders?: string[];
  /** Collection name/id selectors to skip entirely (repeatable). */
  excludeCollections?: string[];
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
   * Target an external Requesto server instead of the embedded scratch
   * server. The server's active workspace is protected by a scratch
   * workspace for the duration of the run and restored afterwards.
   */
  server?: string;
  /** Progress callback for streaming reporters (see RunnerEvent). */
  onEvent?: (event: RunnerEvent) => void;
};

/**
 * The built-in variable that resolves to the scratch server's base URL
 * (embedded or external). Environments use it as
 * `baseUrl = {{requestoServerUrl}}` so Requesto-API suites run anywhere.
 */
export const BUILTIN_SERVER_VAR = 'requestoServerUrl';

/**
 * Execute the `requesto run` command. Resolves the workspace, merges
 * variable/auth overrides from flags and environment variables, starts a
 * scratch server when the run needs one, runs the collections through the
 * engine and returns the summary.
 *
 * The run never mutates the local workspace, and never touches a server's
 * real data: local runs use an embedded ephemeral server, external servers
 * are protected by a scratch workspace.
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

  // 5. Scratch server. The run targets a Requesto server only when something
  //    actually references {{requestoServerUrl}} (or --server is given).
  //    An explicit --var override of the built-in variable pins the URL and
  //    disables the embedded server.
  let serverUrl: string | null = null;
  const externalServer = opts.server ?? null;
  const pinnedUrl = varOverrides.get(BUILTIN_SERVER_VAR) ?? null;
  let embedded: EmbeddedRequestoServer | null = null;
  let isolation: ScratchWorkspaceIsolation | null = null;

  if (externalServer) {
    isolation = new ScratchWorkspaceIsolation({ serverUrl: externalServer });
    await isolation.setup();
    serverUrl = externalServer;
  } else if (!pinnedUrl && referencesBuiltin(effectiveEnv)) {
    embedded = new EmbeddedRequestoServer({ requestoDir: workspacePath });
    await embedded.start();
    serverUrl = embedded.url;
  }

  const runEnv = withBuiltinServerVar(effectiveEnv, serverUrl);

  try {
    // 6. Run
    const summary = await runCollections({
      collections,
      environment: runEnv,
      oauthResolver,
      send: (request, ctx) => workspace.sendRequest(request, ctx),
      scripts: nodeScriptRunner,
      folders: opts.folders,
      excludeCollections: opts.excludeCollections,
      bail: opts.bail,
      insecure: opts.insecure,
      timeout: opts.timeout,
      onEvent: opts.onEvent,
    });

    return {
      summary: { ...summary, totalDuration: Date.now() - started },
      workspacePath,
      environmentName: runEnv?.name ?? null,
      serverUrl,
    };
  } finally {
    if (embedded) {
      try {
        await embedded.stop();
      } catch (err) {
        process.stderr.write(`Warning: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
    if (isolation) {
      try {
        await isolation.teardown();
      } catch (err) {
        process.stderr.write(`Warning: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  }
}

/** Compute the process exit code for a run summary. */
export function computeExitCode(summary: RunSummary): number {
  return summary.failed + summary.errored > 0 ? 1 : 0;
}

/** Whether any enabled variable references the built-in server variable. */
function referencesBuiltin(env: Environment | null): boolean {
  if (!env) return false;
  const pattern = new RegExp(`{{\\s*${BUILTIN_SERVER_VAR}\\s*}}`);
  return env.variables.some(
    (v) => v.enabled && pattern.test(v.currentValue ?? v.value),
  );
}

/**
 * Expose the scratch server URL to the run as the built-in variable, unless
 * the environment already defines it (the user pinned their own value).
 */
function withBuiltinServerVar(env: Environment | null, serverUrl: string | null): Environment | null {
  if (!env || !serverUrl) return env;
  if (env.variables.some((v) => v.key === BUILTIN_SERVER_VAR)) return env;
  return {
    ...env,
    variables: [...env.variables, { key: BUILTIN_SERVER_VAR, value: serverUrl, enabled: true }],
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
