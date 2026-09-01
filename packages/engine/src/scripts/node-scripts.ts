import { Worker } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestResult } from './sandbox-core.ts';
import type { ScriptRunner } from '../runner/run.ts';

const SCRIPT_TIMEOUT_MS = 5000;

type WorkerResponse =
  | { envOverrides: Record<string, string> }
  | { testResults: TestResult[]; envOverrides: Record<string, string> }
  | { error: string };

type WorkerMessage =
  | { type: 'pre-request'; script: string; context: Record<string, unknown> }
  | { type: 'test'; script: string; context: Record<string, unknown> };

/**
 * Resolve the sandbox worker entry. In production builds the compiled
 * `sandbox-worker.js` sits next to this file; in dev/test (tsx, vitest) the
 * `.ts` source is used and executed through Node's type stripping (Node >= 24).
 */
function resolveWorkerPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const js = path.join(here, 'sandbox-worker.js');
  if (fs.existsSync(js)) return js;
  return path.join(here, 'sandbox-worker.ts');
}

function runInWorker(message: WorkerMessage): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(resolveWorkerPath());
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const timeoutId = setTimeout(() => {
      worker.terminate();
      reject(new Error('Script timed out'));
    }, SCRIPT_TIMEOUT_MS);

    worker.on('message', (event: WorkerResponse) => {
      clearTimeout(timeoutId);
      worker.terminate();
      resolve(event);
    });

    worker.on('error', (err: unknown) => {
      clearTimeout(timeoutId);
      worker.terminate();
      reject(new Error(err instanceof Error ? err.message : String(err) || 'Script worker error'));
    });

    worker.postMessage(message);
  });
}

/**
 * Run the pre-request script in an isolated worker thread.
 * Returns the env variable overrides set by the script (key/value pairs).
 * Throws if the script errors or times out.
 */
export async function runPreRequestScript(
  script: string,
  env: Record<string, string>,
  request: { method: string; url: string; headers?: Record<string, string>; body?: string },
): Promise<Record<string, string>> {
  if (!script.trim()) return {};

  const result = await runInWorker({
    type: 'pre-request',
    script,
    context: { env, request },
  });

  if ('error' in result) throw new Error(result.error);
  if ('envOverrides' in result) return result.envOverrides;
  return {};
}

/**
 * Run the test script in an isolated worker thread against the completed response.
 * Returns test results and any env variable overrides set by the script.
 * Throws if the script errors or times out.
 */
export async function runTestScript(
  script: string,
  response: { status: number; statusText: string; headers: Record<string, string>; body: string; duration: number },
  request: { method: string; url: string; headers?: Record<string, string>; body?: string },
  env: Record<string, string>,
): Promise<{ testResults: TestResult[]; envOverrides: Record<string, string> }> {
  if (!script.trim()) return { testResults: [], envOverrides: {} };

  const result = await runInWorker({
    type: 'test',
    script,
    context: { env, response, request },
  });

  if ('error' in result) throw new Error(result.error);
  if ('testResults' in result) return { testResults: result.testResults, envOverrides: result.envOverrides };
  return { testResults: [], envOverrides: {} };
}

/** Script runner backed by Node worker threads; the default for headless runs. */
export const nodeScriptRunner: ScriptRunner = {
  runPreRequest: (script, env, request) => runPreRequestScript(script, env, request),
  runTest: (script, response, request, env) => runTestScript(script, response, request, env),
};
