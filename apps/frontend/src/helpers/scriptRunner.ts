import type { ProxyResponse, ProxyRequest } from '../store/request/types';
import type { Environment, EnvironmentVariableType } from '../store/environments/types';
import type { PreRequestOutcome, TestOutcome, TestResult, ScriptFormEntry } from 'requesto-engine/sandbox-core';
import type { ScriptRunner, ScriptEnvOverrides, ScriptVarsContext } from 'requesto-engine/runner';

export type { TestResult, ScriptEnvOverrides, ScriptVarsContext };

type WorkerResponse = PreRequestOutcome | TestOutcome | { error: string };

const EMPTY_OVERRIDES: PreRequestOutcome = {
  envOverrides: {},
  envTypes: {},
  collectionOverrides: {},
  collectionTypes: {},
  collectionCleared: [],
};

const SCRIPT_TIMEOUT_MS = 5000;

function runInWorker(message: object): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./scriptWorker.ts', import.meta.url), { type: 'module' });

    const timeoutId = setTimeout(() => {
      worker.terminate();
      reject(new Error('Script timed out'));
    }, SCRIPT_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      clearTimeout(timeoutId);
      worker.terminate();
      resolve(event.data);
    };

    worker.onerror = (err) => {
      clearTimeout(timeoutId);
      worker.terminate();
      reject(new Error(err.message ?? 'Script worker error'));
    };

    worker.postMessage(message);
  });
}

function buildEnvRecord(env: Environment | null): Record<string, string> {
  if (!env) return {};
  return Object.fromEntries(
    env.variables.filter((v) => v.enabled).map((v) => [v.key, v.currentValue ?? v.value]),
  );
}

/** Declared types of enabled env variables, omitted entirely when none is set. */
function buildEnvTypes(env: Environment | null): Record<string, EnvironmentVariableType> | undefined {
  if (!env) return undefined;
  const types: Record<string, EnvironmentVariableType> = {};
  for (const v of env.variables) {
    if (v.enabled && v.type) types[v.key] = v.type;
  }
  return Object.keys(types).length > 0 ? types : undefined;
}

/**
 * Run the pre-request script in an isolated Worker.
 * Returns the env variable overrides set by the script (key/value pairs
 * plus inferred types).
 * Throws if the script errors or times out.
 */
export async function runPreRequestScript(
  script: string,
  env: Environment | null,
  request: Pick<ProxyRequest, 'method' | 'url' | 'headers' | 'body'>,
  vars?: ScriptVarsContext,
): Promise<PreRequestOutcome> {
  return runPreRequestWithRecord(script, buildEnvRecord(env), request, buildEnvTypes(env), vars);
}

async function runPreRequestWithRecord(
  script: string,
  env: Record<string, string>,
  request: Pick<ProxyRequest, 'method' | 'url' | 'headers' | 'body'>,
  envTypes?: Record<string, EnvironmentVariableType>,
  vars?: ScriptVarsContext,
): Promise<PreRequestOutcome> {
  if (!script.trim()) return { ...EMPTY_OVERRIDES };

  const { collectionId: _c, ...records } = vars ?? {};
  const result = await runInWorker({
    type: 'pre-request',
    script,
    context: {
      env,
      envTypes,
      request: { method: request.method, url: request.url, headers: request.headers, body: request.body },
      ...records,
    },
  });

  if ('error' in result) throw new Error(result.error);
  if ('envOverrides' in result) return result;
  return { ...EMPTY_OVERRIDES };
}

/**
 * Run the test script in an isolated Worker against the completed response.
 * Returns test results and any env variable overrides set by the script.
 * Throws if the script errors or times out.
 */
export async function runTestScript(
  script: string,
  response: ProxyResponse,
  request: Pick<ProxyRequest, 'method' | 'url' | 'headers' | 'body' | 'formDataEntries'>,
  env: Environment | null,
  vars?: ScriptVarsContext,
): Promise<TestOutcome> {
  return runTestWithRecord(script, response, request, buildEnvRecord(env), buildEnvTypes(env), vars);
}

async function runTestWithRecord(
  script: string,
  response: Pick<ProxyResponse, 'status' | 'statusText' | 'headers' | 'body' | 'duration'>,
  request: Pick<ProxyRequest, 'method' | 'url' | 'headers' | 'body'> & { formDataEntries?: ScriptFormEntry[] },
  env: Record<string, string>,
  envTypes?: Record<string, EnvironmentVariableType>,
  vars?: ScriptVarsContext,
): Promise<TestOutcome> {
  if (!script.trim()) return { ...EMPTY_OVERRIDES, testResults: [] };

  const { collectionId: _c, ...records } = vars ?? {};
  const result = await runInWorker({
    type: 'test',
    script,
    context: {
      env,
      envTypes,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        duration: response.duration,
      },
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
        formDataEntries: request.formDataEntries?.map(({ key, value, type, fileName }) => ({ key, value, type, fileName })),
      },
      ...records,
    },
  });

  if ('error' in result) throw new Error(result.error);
  if ('testResults' in result) return result;
  return { ...EMPTY_OVERRIDES, testResults: [] };
}

/**
 * Script runner backed by a browser Web Worker; the app's counterpart to
 * the CLI's Node worker runner. Implements the engine's ScriptRunner shape.
 */
export const browserScriptRunner: ScriptRunner = {
  runPreRequest: (script, env, request, envTypes, vars) => runPreRequestWithRecord(script, env, request, envTypes, vars),
  runTest: (script, response, request, env, envTypes, vars) => runTestWithRecord(script, response, request, env, envTypes, vars),
};
