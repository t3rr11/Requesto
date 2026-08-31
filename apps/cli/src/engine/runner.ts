import type { OAuthTokenResolver } from 'requesto-backend/utils/auth';
import { substituteInAuth, substituteInRequest } from 'requesto-backend/utils/variable-substitution';
import type { ProxyRequest, ProxyResponse } from 'requesto-backend/models/proxy';
import type { Collection, Environment, RunRequestResult, RunSummary, SavedRequest } from '../types.ts';
import type { RunnerEvent } from '../types.ts';
import { buildProxyRequest } from './graphql.ts';
import { runPreRequestScript, runTestScript } from './scripts.ts';

export type RunnerOptions = {
  collections: Collection[];
  /** Fully-resolved environment (CLI vars already merged in). May be null. */
  environment: Environment | null;
  oauthResolver: OAuthTokenResolver;
  /** Transport function. The CLI wires this to the backend ProxyService. */
  send: SendFn;
  /** Folder name/id selectors applied to every collection (case-insensitive). */
  folders?: string[];
  /** Stop after the first failed/errored request. */
  bail?: boolean;
  /** Per-request timeout in ms. */
  timeout?: number;
  /** Skip TLS certificate verification on every request. */
  insecure?: boolean;
  /**
   * Progress callback — invoked as the run unfolds so reporters can stream
   * output. Events arrive in order: collection-start, then per request
   * request-start → request-end.
   */
  onEvent?: (event: RunnerEvent) => void;
};

export type SendFn = (
  request: ProxyRequest,
  ctx: { oauthResolver: OAuthTokenResolver; timeout?: number },
) => Promise<ProxyResponse>;

/** Ordered display items mirroring the client runner (folders before requests, depth tracked). */
export type DisplayItem =
  | { kind: 'folder'; folderId: string; name: string; depth: number }
  | { kind: 'request'; request: SavedRequest; depth: number };

export function buildDisplayItems(collection: Collection, folderIds?: Set<string>): DisplayItem[] {
  const items: DisplayItem[] = [];

  function addFolderContents(fId: string, depth: number) {
    const reqs = collection.requests
      .filter((r) => r.folderId === fId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    reqs.forEach((r) => items.push({ kind: 'request', request: r, depth }));

    const childFolders = (collection.folders || [])
      .filter((f) => f.parentId === fId)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const cf of childFolders) {
      items.push({ kind: 'folder', folderId: cf.id, name: cf.name, depth });
      addFolderContents(cf.id, depth + 1);
    }
  }

  if (folderIds && folderIds.size > 0) {
    // Only emit folders matching the selector; their whole subtree follows.
    const rootFolders = (collection.folders || [])
      .filter((f) => folderIds.has(f.id) || folderIds.has(f.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const rf of rootFolders) {
      items.push({ kind: 'folder', folderId: rf.id, name: rf.name, depth: 0 });
      addFolderContents(rf.id, 1);
    }
  } else {
    const rootFolders = (collection.folders || [])
      .filter((f) => !f.parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const rf of rootFolders) {
      items.push({ kind: 'folder', folderId: rf.id, name: rf.name, depth: 0 });
      addFolderContents(rf.id, 1);
    }
    const rootReqs = collection.requests
      .filter((r) => !r.folderId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    rootReqs.forEach((r) => items.push({ kind: 'request', request: r, depth: 0 }));
  }

  return items;
}

/**
 * Resolve `--folder` selectors (names or ids, case-insensitive) to matching
 * folder ids within a collection.
 */
export function resolveFolderIds(collection: Collection, selectors: string[]): Set<string> | null {
  if (selectors.length === 0) return null;
  const lower = new Set(selectors.map((s) => s.toLowerCase()));
  const matched = new Set<string>();
  for (const folder of collection.folders || []) {
    if (lower.has(folder.name.toLowerCase()) || lower.has(folder.id.toLowerCase())) {
      matched.add(folder.id);
    }
  }
  return matched;
}

function envRecord(env: Environment | null): Record<string, string> {
  if (!env) return {};
  return Object.fromEntries(
    env.variables.filter((v) => v.enabled).map((v) => [v.key, v.currentValue ?? v.value]),
  );
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
 * Run the given collections sequentially, mirroring the client's collection
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
    const folderIds = resolveFolderIds(collection, opts.folders ?? []);
    // Folder selectors were given but this collection has no matching folder —
    // run nothing here rather than falling back to the whole collection.
    if (folderIds !== null && folderIds.size === 0) continue;
    const items = buildDisplayItems(collection, folderIds ?? undefined);

    for (const item of items) {
      if (item.kind !== 'request') continue;

      if (bailTriggered) {
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

        // 2. Pre-request script — may set environment variables.
        if (item.request.preRequestScript?.trim()) {
          const overrides = await runPreRequestScript(
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
        const response = await opts.send(proxyReq, { oauthResolver: opts.oauthResolver, timeout: opts.timeout });

        // 5. Test script — may set environment variables for later requests.
        let testResults: RunRequestResult['testResults'] = [];
        if (item.request.testScript?.trim()) {
          const outcome = await runTestScript(
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
