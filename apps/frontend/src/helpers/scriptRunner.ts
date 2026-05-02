import type { ProxyResponse, ProxyRequest } from '../store/request/types';
import type { Environment } from '../store/environments/types';

export type TestResult = {
  name: string;
  passed: boolean;
  error?: string;
};

type WorkerResponse =
  | { envOverrides: Record<string, string> }
  | { testResults: TestResult[] }
  | { error: string };

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
  return Object.fromEntries(env.variables.filter((v) => v.enabled).map((v) => [v.key, v.value]));
}

/**
 * Run the pre-request script in an isolated Worker.
 * Returns the env variable overrides set by the script (key/value pairs).
 * Throws if the script errors or times out.
 */
export async function runPreRequestScript(
  script: string,
  env: Environment | null,
  request: Pick<ProxyRequest, 'method' | 'url' | 'headers' | 'body'>,
): Promise<Record<string, string>> {
  if (!script.trim()) return {};

  const result = await runInWorker({
    type: 'pre-request',
    script,
    context: {
      env: buildEnvRecord(env),
      request: { method: request.method, url: request.url, headers: request.headers, body: request.body },
    },
  });

  if ('error' in result) throw new Error(result.error);
  if ('envOverrides' in result) return result.envOverrides;
  return {};
}

/**
 * Run the test script in an isolated Worker against the completed response.
 * Returns an array of TestResult objects.
 * Throws if the script errors or times out.
 */
export async function runTestScript(
  script: string,
  response: ProxyResponse,
  request: Pick<ProxyRequest, 'method' | 'url' | 'headers' | 'body'>,
  env: Environment | null,
): Promise<TestResult[]> {
  if (!script.trim()) return [];

  const result = await runInWorker({
    type: 'test',
    script,
    context: {
      env: buildEnvRecord(env),
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        duration: response.duration,
      },
      request: { method: request.method, url: request.url, headers: request.headers, body: request.body },
    },
  });

  if ('error' in result) throw new Error(result.error);
  if ('testResults' in result) return result.testResults;
  return [];
}
