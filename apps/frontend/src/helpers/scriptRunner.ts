import type { ProxyResponse, ProxyRequest } from '../store/request/types';
import type { Environment, EnvironmentVariableType } from '../store/environments/types';
import type { PreRequestOutcome, TestOutcome, TestResult, ScriptFormEntry } from 'requesto-engine/sandbox-core';
import type { ScriptRunner, ScriptEnvOverrides } from 'requesto-engine/runner';

export type { TestResult, ScriptEnvOverrides };

type WorkerResponse = PreRequestOutcome | TestOutcome | { error: string };

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
): Promise<PreRequestOutcome> {
  return runPreRequestWithRecord(script, buildEnvRecord(env), request);
}

async function runPreRequestWithRecord(
  script: string,
  env: Record<string, string>,
  request: Pick<ProxyRequest, 'method' | 'url' | 'headers' | 'body'>,
): Promise<PreRequestOutcome> {
  if (!script.trim()) return { envOverrides: {}, envTypes: {} };

  const result = await runInWorker({
    type: 'pre-request',
    script,
    context: {
      env,
      request: { method: request.method, url: request.url, headers: request.headers, body: request.body },
    },
  });

  if ('error' in result) throw new Error(result.error);
  if ('envOverrides' in result) return { envOverrides: result.envOverrides, envTypes: result.envTypes ?? {} };
  return { envOverrides: {}, envTypes: {} };
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
): Promise<{ testResults: TestResult[]; envOverrides: Record<string, string>; envTypes: Record<string, EnvironmentVariableType> }> {
  return runTestWithRecord(script, response, request, buildEnvRecord(env));
}

async function runTestWithRecord(
  script: string,
  response: Pick<ProxyResponse, 'status' | 'statusText' | 'headers' | 'body' | 'duration'>,
  request: Pick<ProxyRequest, 'method' | 'url' | 'headers' | 'body'> & { formDataEntries?: ScriptFormEntry[] },
  env: Record<string, string>,
): Promise<{ testResults: TestResult[]; envOverrides: Record<string, string>; envTypes: Record<string, EnvironmentVariableType> }> {
  if (!script.trim()) return { testResults: [], envOverrides: {}, envTypes: {} };

  const result = await runInWorker({
    type: 'test',
    script,
    context: {
      env,
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
    },
  });

  if ('error' in result) throw new Error(result.error);
  if ('testResults' in result) {
    return { testResults: result.testResults, envOverrides: result.envOverrides, envTypes: result.envTypes ?? {} };
  }
  return { testResults: [], envOverrides: {}, envTypes: {} };
}

/**
 * Script runner backed by a browser Web Worker; the app's counterpart to
 * the CLI's Node worker runner. Implements the engine's ScriptRunner shape.
 */
export const browserScriptRunner: ScriptRunner = {
  runPreRequest: (script, env, request) => runPreRequestWithRecord(script, env, request),
  runTest: (script, response, request, env) => runTestWithRecord(script, response, request, env),
};
