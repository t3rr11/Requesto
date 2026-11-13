import type { ScriptFormEntry } from '../scripts/sandbox-core.ts';
import { buildProxyRequest } from '../request/build-proxy-request.ts';
import { getGraphQLResponseInfo } from '../request/graphql-envelope.ts';
import { buildCollectionItems, resolveFolderIds } from './display.ts';
import type {
  OAuthTokenResolver,
  ProxyRequest,
  ProxyResponse,
  Collection,
  Environment,
  EnvironmentVariableType,
  RunRequestResult,
  RunSummary,
  RunnerEvent,
  TestResult,
  WarningKind
} from '../types.ts';
import {
  effectiveVariablesWithOverrides,
  mergeScriptOverrides,
  scriptVariableRecords,
  substituteInRequest,
  substituteInAuth,
  type ScriptScopeOverrides,
} from 'requesto-backend/utils/variable-substitution';

/** Request context passed to script runners. */
export type ScriptRequestContext = { method: string; url: string; headers?: Record<string, string>; body?: string; formDataEntries?: ScriptFormEntry[] };

/** Response context passed to test-script runners. */
export type ScriptResponseContext = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
};

/**
 * Env variable overrides set by a script, with the type inferred per key.
 * Collection overrides are scoped separately and only contain keys the
 * script actually touched.
 */
export type ScriptEnvOverrides = {
  envOverrides: Record<string, string>;
  /** Type per key in `envOverrides`; keys without an entry keep their existing type. */
  envTypes?: Record<string, EnvironmentVariableType>;
  envCleared?: string[];
  collectionOverrides?: Record<string, string>;
  collectionTypes?: Record<string, EnvironmentVariableType>;
  collectionCleared?: string[];
};

/**
 * Variable records and scope ids passed to script runners alongside the
 * environment: the sandbox-visible `collectionVariables` values, plus the
 * collection a script's `set` calls belong to so hosts can persist them to
 * the right sidecar scope.
 */
export type ScriptVarsContext = {
  collectionId?: string;
  collectionVariables?: Record<string, string>;
  collectionVariableTypes?: Record<string, EnvironmentVariableType>;
};

/**
 * Executes pre-request and test scripts for a run. Hosts provide their own
 * implementation: a Node worker-thread runner for headless runs and a
 * browser Web Worker runner for the app.
 */
export type ScriptRunner = {
  runPreRequest(
    script: string,
    env: Record<string, string>,
    request: ScriptRequestContext,
    envTypes?: Record<string, EnvironmentVariableType>,
    vars?: ScriptVarsContext,
  ): Promise<ScriptEnvOverrides>;
  runTest(
    script: string,
    response: ScriptResponseContext,
    request: ScriptRequestContext,
    env: Record<string, string>,
    envTypes?: Record<string, EnvironmentVariableType>,
    vars?: ScriptVarsContext,
  ): Promise<{ testResults: TestResult[] } & ScriptEnvOverrides>;
};

export type RunnerOptions = {
  collections: Collection[];
  /** Fully-resolved environment (CLI vars already merged in). May be null. */
  environment: Environment | null;
  oauthResolver: OAuthTokenResolver;
  /** Transport function. Hosts wire this to the backend ProxyService or the app's request store. */
  send: SendFn;
  /** Script executor for the host environment (Node worker threads or browser Web Worker). */
  scripts: ScriptRunner;
  /** Folder name/id selectors applied to every collection (case-insensitive). */
  folders?: string[];
  /** Collection name/id selectors to skip entirely (case-insensitive). */
  excludeCollections?: string[];
  /** Stop after the first failed/errored request. */
  bail?: boolean;
  /** Per-request timeout in ms. */
  timeout?: number;
  /** Skip TLS certificate verification on every request. */
  insecure?: boolean;
  /** Abort signal: when fired, remaining requests are marked skipped. */
  signal?: AbortSignal;
  /**
   * Warning tier for responses that a zero-test run would otherwise report as
   * plain 'passed': HTTP 4xx/5xx statuses and GraphQL `errors` envelopes.
   * Warnings are advisory: they never fail a request and never trigger bail.
   */
  warnings?: {
    /** Warn when a 4xx/5xx response has no tests to assert it. Default true. */
    httpErrorStatuses?: boolean;
  };
  /**
   * Progress callback: invoked as the run unfolds so reporters and UIs can
   * stream output. Events arrive in order: collection-start, then per request
   * request-start → request-end.
   */
  onEvent?: (event: RunnerEvent) => void;
};

export type SendFn = (
  request: ProxyRequest,
  ctx: { oauthResolver: OAuthTokenResolver; timeout?: number; signal?: AbortSignal },
) => Promise<ProxyResponse>;

function envRecord(env: Environment | null): Record<string, string> {
  if (!env) return {};
  return Object.fromEntries(
    env.variables.filter((v) => v.enabled).map((v) => [v.key, v.currentValue ?? v.value]),
  );
}

/** Declared types of enabled env variables, omitted entirely when none is set. */
function envTypesRecord(env: Environment | null): Record<string, EnvironmentVariableType> | undefined {
  if (!env) return undefined;
  const types: Record<string, EnvironmentVariableType> = {};
  for (const v of env.variables) {
    if (v.enabled && v.type) types[v.key] = v.type;
  }
  return Object.keys(types).length > 0 ? types : undefined;
}

function isExcluded(collection: Collection, selectors: string[]): boolean {
  if (selectors.length === 0) return false;
  const lower = selectors.map((s) => s.toLowerCase());
  return lower.includes(collection.name.toLowerCase()) || lower.includes(collection.id.toLowerCase());
}

/** Values visible to scripts: the environment plus script-set overrides, with cleared keys removed. */
function envRecordWithOverrides(env: Environment | null, overrides: ScriptScopeOverrides): Record<string, string> {
  const record = { ...envRecord(env), ...overrides.values };
  for (const key of overrides.cleared ?? []) delete record[key];
  return record;
}

/** Declared types visible to scripts: env types plus types recorded for script-set values. */
function envTypesWithOverrides(
  env: Environment | null,
  overrides: Record<string, EnvironmentVariableType>,
): Record<string, EnvironmentVariableType> | undefined {
  const types = { ...envTypesRecord(env), ...overrides };
  return Object.keys(types).length > 0 ? types : undefined;
}

/** The sandbox-visible collection record for a request. */
function varsContextFor(
  collection: Collection,
  collectionOverrides?: ScriptScopeOverrides,
): ScriptVarsContext {
  const records = scriptVariableRecords(collection, { collection: collectionOverrides });
  return {
    collectionId: collection.id,
    ...records,
  };
}

/**
 * Determine the final status for an executed request.
 *
 * - any failing test → 'failed'
 * - no tests at all + no failing tests → 'warned' when a warning condition is
 *   present (HTTP 4xx/5xx, or a GraphQL `errors` envelope) and warnings are
 *   enabled; otherwise 'passed'
 * - everything else (including 4xx/5xx responses asserted by at least one
 *   passing test) → 'passed'
 */
function resolveStatus(
  allTestsPassed: boolean,
  testCount: number,
  response: ProxyResponse,
  warnings: RunnerOptions['warnings'],
): { status: RunRequestResult['status']; warning?: string; warningKind?: WarningKind } {
  if (!allTestsPassed) return { status: 'failed' };
  const warningsEnabled = warnings?.httpErrorStatuses !== false;
  const hasTests = testCount > 0;
  if (warningsEnabled && !hasTests) {
    if (response.status >= 400) {
      const statusText = response.statusText?.trim();
      return {
        status: 'warned',
        warning: statusText ? `HTTP ${response.status} ${statusText}` : `HTTP ${response.status}`,
        warningKind: 'http-status',
      };
    }
    const graphqlInfo = getGraphQLResponseInfo(response);
    if (graphqlInfo && graphqlInfo.errors.length > 0) {
      return {
        status: 'warned',
        warning: graphqlInfo.errors[0].message,
        warningKind: 'graphql-errors',
      };
    }
  }
  return { status: 'passed' };
}

/**
 * Run the given collections sequentially, mirroring the app's collection
 * runner: pre-request script → variable substitution → send → test script.
 * Environment changes made by scripts are chained in memory (never written
 * back to the workspace). Collection variables are re-scoped per request:
 * the environment is shared across collections, collection variables are
 * not.
 */
export async function runCollections(opts: RunnerOptions): Promise<RunSummary> {
  const results: RunRequestResult[] = [];
  const started = Date.now();
  let liveEnv = opts.environment;
  let envScript: ScriptScopeOverrides = { values: {} };

  // Collection variables are not shared across collections, so their
  // script-set overrides reset when the run moves to the next one.
  let collectionScript: ScriptScopeOverrides = { values: {} };
  let bailTriggered = false;
  let lastCollectionId: string | null = null;

  for (const collection of opts.collections) {
    if (isExcluded(collection, opts.excludeCollections ?? [])) continue;
    const folderIds = resolveFolderIds(collection, opts.folders ?? []);
    // Folder selectors were given but this collection has no matching folder:
    // run nothing here rather than falling back to the whole collection.
    if (folderIds !== null && folderIds.size === 0) continue;
    const items = buildCollectionItems(collection, folderIds ?? undefined);

    for (const item of items) {
      if (item.kind !== 'request') continue;

      if (bailTriggered || opts.signal?.aborted) {
        const skipped: RunRequestResult = {
          collectionId: collection.id,
          collectionName: collection.name,
          request: item.request,
          status: 'skipped',
          response: null,
          testResults: [],
        };
        results.push(skipped);
        opts.onEvent?.({ type: 'request-end', result: skipped });
        continue;
      }

      if (collection.id !== lastCollectionId) {
        opts.onEvent?.({ type: 'collection-start', collectionId: collection.id, collectionName: collection.name });
        lastCollectionId = collection.id;
        collectionScript = { values: {} };
      }

      const base: Omit<RunRequestResult, 'status' | 'response' | 'testResults'> = {
        collectionId: collection.id,
        collectionName: collection.name,
        request: item.request,
      };

      opts.onEvent?.({
        type: 'request-start',
        collectionId: collection.id,
        collectionName: collection.name,
        request: item.request,
      });

      try {
        // 1. Build the proxy request (GraphQL requests are expanded here).
        let proxyReq = buildProxyRequest(item.request, opts.insecure);

        // 2. Pre-request script: may set environment or collection variables.
        const vars = varsContextFor(collection, collectionScript);
        if (item.request.preRequestScript?.trim()) {
          const outcome = await opts.scripts.runPreRequest(
            item.request.preRequestScript,
            envRecordWithOverrides(liveEnv, envScript),
            { method: proxyReq.method, url: proxyReq.url, headers: proxyReq.headers, body: proxyReq.body },
            envTypesWithOverrides(liveEnv, envScript.types ?? {}),
            vars,
          );
          mergeScriptOverrides(envScript, {
            values: outcome.envOverrides,
            types: outcome.envTypes,
            cleared: outcome.envCleared,
          });
          mergeScriptOverrides(collectionScript, {
            values: outcome.collectionOverrides ?? {},
            types: outcome.collectionTypes,
            cleared: outcome.collectionCleared,
          });
        }

        // 3. Variable substitution: env over this collection's own variables, with script-set values on top.
        const scope = effectiveVariablesWithOverrides(liveEnv, collection, {
          env: envScript,
          collection: collectionScript,
        });
        const substituted = substituteInRequest(
          {
            url: proxyReq.url,
            headers: proxyReq.headers,
            body: proxyReq.body,
            bodyType: proxyReq.bodyType,
            formDataEntries: proxyReq.formDataEntries,
          },
          scope,
        );
        const auth = substituteInAuth(proxyReq.auth, scope);
        proxyReq = { ...proxyReq, ...substituted, auth };

        // 4. Send.
        const response = await opts.send(proxyReq, {
          oauthResolver: opts.oauthResolver,
          timeout: opts.timeout,
          signal: opts.signal,
        });

        // 5. Test script: may set environment or collection variables for later requests.
        let testResults: RunRequestResult['testResults'] = [];
        if (item.request.testScript?.trim()) {
          const outcome = await opts.scripts.runTest(
            item.request.testScript,
            {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              body: response.body,
              duration: response.duration,
            },
            {
              method: proxyReq.method,
              url: proxyReq.url,
              headers: proxyReq.headers,
              body: proxyReq.body,
              formDataEntries: proxyReq.formDataEntries?.map(({ key, value, type, fileName }) => ({ key, value, type, fileName })),
            },
            envRecordWithOverrides(liveEnv, envScript),
            envTypesWithOverrides(liveEnv, envScript.types ?? {}),
            varsContextFor(collection, collectionScript),
          );
          testResults = outcome.testResults;
          mergeScriptOverrides(envScript, {
            values: outcome.envOverrides,
            types: outcome.envTypes,
            cleared: outcome.envCleared,
          });
          mergeScriptOverrides(collectionScript, {
            values: outcome.collectionOverrides ?? {},
            types: outcome.collectionTypes,
            cleared: outcome.collectionCleared,
          });
        }

        const allPassed = testResults.every((t) => t.passed);
        const { status, warning, warningKind } = resolveStatus(allPassed, testResults.length, response, opts.warnings);
        const result: RunRequestResult = {
          ...base,
          status,
          response,
          testResults,
          ...(warning !== undefined && { warning }),
          ...(warningKind !== undefined && { warningKind }),
          duration: response.duration,
        };
        results.push(result);
        opts.onEvent?.({ type: 'request-end', result });

        if (!allPassed && opts.bail) bailTriggered = true;
      } catch (err) {
        const result: RunRequestResult = {
          ...base,
          status: 'error',
          response: null,
          testResults: [],
          error: err instanceof Error ? err.message : String(err),
        };
        results.push(result);
        opts.onEvent?.({ type: 'request-end', result });
        if (opts.bail) bailTriggered = true;
      }
    }
  }

  const executed = results.filter((r) => r.status !== 'skipped');
  return {
    results,
    executed: executed.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    errored: results.filter((r) => r.status === 'error').length,
    warned: results.filter((r) => r.status === 'warned').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    totalTests: results.reduce((acc, r) => acc + r.testResults.length, 0),
    passedTests: results.reduce((acc, r) => acc + r.testResults.filter((t) => t.passed).length, 0),
    totalDuration: Date.now() - started,
    environmentName: opts.environment?.name ?? null,
    bailTriggered,
  };
}
