import type { Collection, Environment, EnvironmentVariable, OAuthToken, RequestRunResult, RunSummary, SavedRequest } from './types';
import { executeRequest } from './httpClient';
import { runPreRequestScript, runTestScript } from './scriptEngine';
import type { Reporter } from './reporter';

interface FlatItem {
  request: SavedRequest;
  folderPath: string[];
}

/** Mirror the order from buildDisplayItems in the frontend runner. */
function flattenCollection(collection: Collection): FlatItem[] {
  const result: FlatItem[] = [];

  function addFolderContents(folderId: string, pathSoFar: string[]): void {
    const requests = collection.requests
      .filter((r) => r.folderId === folderId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const req of requests) result.push({ request: req, folderPath: pathSoFar });

    const childFolders = collection.folders
      .filter((f) => f.parentId === folderId)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const folder of childFolders) {
      addFolderContents(folder.id, [...pathSoFar, folder.name]);
    }
  }

  // Root folders first (alphabetical), then root requests
  const rootFolders = collection.folders
    .filter((f) => !f.parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const folder of rootFolders) {
    addFolderContents(folder.id, [folder.name]);
  }

  const rootRequests = collection.requests
    .filter((r) => !r.folderId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const req of rootRequests) result.push({ request: req, folderPath: [] });

  return result;
}

function buildEnvStore(env: Environment | null, runtimeOverrides: Record<string, string>): Record<string, string> {
  const store: Record<string, string> = {};
  if (env) {
    for (const v of env.variables) {
      if (v.enabled) store[v.key] = v.currentValue ?? v.value;
    }
  }
  // Runtime overrides (from pre-request scripts during this run) take precedence
  for (const [k, v] of Object.entries(runtimeOverrides)) store[k] = v;
  return store;
}

function envStoreToVariables(store: Record<string, string>): EnvironmentVariable[] {
  return Object.entries(store).map(([key, value]) => ({ key, value, currentValue: value, enabled: true }));
}

export async function runCollection(
  collection: Collection,
  env: Environment | null,
  oauthTokens: Record<string, OAuthToken>,
  reporter: Reporter,
): Promise<RunSummary> {
  const items = flattenCollection(collection);
  const results: RequestRunResult[] = [];

  // Runtime env overrides accumulate across pre-request scripts during the run
  const runtimeOverrides: Record<string, string> = {};

  const runStart = Date.now();

  reporter.onRunStart(collection.name, items.length);

  for (const { request, folderPath } of items) {
    reporter.onRequestStart(request, folderPath);

    const result: RequestRunResult = { request, folderPath, testResults: [] };

    try {
      // Build effective variable set for this request
      let envStore = buildEnvStore(env, runtimeOverrides);

      // Run pre-request script (may update envStore)
      if (request.preRequestScript?.trim()) {
        const requestCtx = { method: request.method, url: request.url, headers: request.headers, body: request.body };
        envStore = runPreRequestScript(request.preRequestScript, envStore, requestCtx);
        // Persist script-set values for subsequent requests
        for (const [k, v] of Object.entries(envStore)) runtimeOverrides[k] = v;
      }

      const variables = envStoreToVariables(envStore);

      const response = await executeRequest(request, variables, oauthTokens);
      result.status = response.status;
      result.statusText = response.statusText;
      result.duration = response.duration;
      result.body = response.body;
      result.bodyEncoding = response.bodyEncoding;

      // Run test script
      if (request.testScript?.trim()) {
        const requestCtx = { method: request.method, url: request.url, headers: request.headers, body: request.body };
        const scriptResponse = {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body,
          duration: response.duration,
        };
        const { testResults, envStore: updatedStore } = runTestScript(
          request.testScript,
          scriptResponse,
          requestCtx,
          envStore,
        );
        result.testResults = testResults;
        // Propagate any env.set() calls from test scripts
        for (const [k, v] of Object.entries(updatedStore)) runtimeOverrides[k] = v;
      }
    } catch (err) {
      if (err instanceof Error) {
        // axios network errors can have an empty .message; prefer .cause or .code
        const code = (err as NodeJS.ErrnoException).code;
        const cause = (err as { cause?: unknown }).cause;
        const causeMsg = cause instanceof Error ? cause.message : undefined;
        result.error = err.message || causeMsg || (code ? `${err.name}: ${code}` : err.name) || 'Unknown error';
      } else {
        result.error = String(err) || 'Unknown error';
      }
    }

    results.push(result);
    reporter.onRequestEnd(result);
  }

  const durationMs = Date.now() - runStart;
  const failed = results.filter((r) => r.error || r.testResults.some((t) => !t.passed)).length;
  const passed = results.length - failed;

  const summary: RunSummary = {
    collectionName: collection.name,
    passed,
    failed,
    total: results.length,
    durationMs,
    results,
  };

  reporter.onRunEnd(summary);
  return summary;
}
