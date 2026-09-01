import type { OAuthTokenResolver, ProxyRequest, ProxyResponse, Collection, Environment, RunRequestResult, RunSummary, RunnerEvent, TestResult } from '../types.ts';
import { substituteInRequest, substituteInAuth } from 'requesto-backend/utils/variable-substitution';
import { buildProxyRequest } from '../request/build-proxy-request.ts';
import { buildCollectionItems, resolveFolderIds } from './display.ts';

/** Request context passed to script runners. */
export type ScriptRequestContext = { method: string; url: string; headers?: Record<string, string>; body?: string };

/** Response context passed to test-script runners. */
export type ScriptResponseContext = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
};

/**
 * Executes pre-request and test scripts for a run. Hosts provide their own
 * implementation: a Node worker-thread runner for headless runs and a
 * browser Web Worker runner for the app.
 */
export type ScriptRunner = {
  runPreRequest(script: string, env: Record<string, string>, request: ScriptRequestContext): Promise<Record<string, string>>;
  runTest(
    script: string,
    response: ScriptResponseContext,
    request: ScriptRequestContext,
    env: Record<string, string>,
  ): Promise<{ testResults: TestResult[]; envOverrides: Record<string, string> }>;
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

function isExcluded(collection: Collection, selectors: string[]): boolean {
  if (selectors.length === 0) return false;
  const lower = selectors.map((s) => s.toLowerCase());
  return lower.includes(collection.name.toLowerCase()) || lower.includes(collection.id.toLowerCase());
}

/** Merge script-set overrides into the live environment (in memory only).
 *  Keys not present in the environment are appended as new variables so
 *  `environment.set()` on a fresh key works in chained requests. */
function applyEnvOverrides(env: Environment | null, overrides: Record<string, string>): Environment | null {
  if (!env || Object.keys(overrides).length === 0) return env;
  const variables = env.variables.map((v) =>
    Object.prototype.hasOwnProperty.call(overrides, v.key) ? { ...v, currentValue: overrides[v.key] } : v,
  );
  for (const [key, value] of Object.entries(overrides)) {
    if (!variables.some((v) => v.key === key)) {
      variables.push({ key, value, currentValue: value, enabled: true });
    }
  }
  return { ...env, variables };
}

/**
 * Run the given collections sequentially, mirroring the app's collection
 * runner: pre-request script → variable substitution → send → test script.
 * Environment changes made by scripts are chained in memory (never written
 * back to the workspace).
 */
export async function runCollections(opts: RunnerOptions): Promise<RunSummary> {
  const results: RunRequestResult[] = [];
  const started = Date.now();
  let liveEnv = opts.environment;
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

        // 2. Pre-request script: may set environment variables.
        if (item.request.preRequestScript?.trim()) {
          const overrides = await opts.scripts.runPreRequest(
            item.request.preRequestScript,
            envRecord(liveEnv),
            { method: proxyReq.method, url: proxyReq.url, headers: proxyReq.headers, body: proxyReq.body },
          );
          liveEnv = applyEnvOverrides(liveEnv, overrides);
        }

        // 3. Variable substitution with the live environment.
        const substituted = substituteInRequest(
          {
            url: proxyReq.url,
            headers: proxyReq.headers,
            body: proxyReq.body,
            formDataEntries: proxyReq.formDataEntries,
          },
          liveEnv,
        );
        const auth = substituteInAuth(proxyReq.auth, liveEnv);
        proxyReq = { ...proxyReq, ...substituted, auth };

        // 4. Send.
        const response = await opts.send(proxyReq, {
          oauthResolver: opts.oauthResolver,
          timeout: opts.timeout,
          signal: opts.signal,
        });

        // 5. Test script: may set environment variables for later requests.
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
            { method: proxyReq.method, url: proxyReq.url, headers: proxyReq.headers, body: proxyReq.body },
            envRecord(liveEnv),
          );
          testResults = outcome.testResults;
          liveEnv = applyEnvOverrides(liveEnv, outcome.envOverrides);
        }

        const allPassed = testResults.every((t) => t.passed);
        const status: RunRequestResult['status'] = allPassed ? 'passed' : 'failed';
        const result: RunRequestResult = { ...base, status, response, testResults, duration: response.duration };
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
    skipped: results.filter((r) => r.status === 'skipped').length,
    totalTests: results.reduce((acc, r) => acc + r.testResults.length, 0),
    passedTests: results.reduce((acc, r) => acc + r.testResults.filter((t) => t.passed).length, 0),
    totalDuration: Date.now() - started,
    environmentName: opts.environment?.name ?? null,
    bailTriggered,
  };
}
