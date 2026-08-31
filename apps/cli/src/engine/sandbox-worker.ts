/**
 * Worker thread entry — thin wrapper around the sandbox core.
 *
 * Receives `{ type, script, context }` messages, executes the script and
 * posts the result back. Any script error is reported as `{ error }`.
 *
 * Must use only erasable TypeScript syntax — this file is executed directly
 * by Node's type stripping in dev/test (Node >= 24) and via tsc output in
 * production builds.
 */
import { parentPort } from 'node:worker_threads';
import { executePreRequestScript, executeTestScript } from './sandbox-core.ts';

type WorkerMessage =
  | { type: 'pre-request'; script: string; context: Parameters<typeof executePreRequestScript>[1] }
  | { type: 'test'; script: string; context: Parameters<typeof executeTestScript>[1] };

parentPort?.on('message', (message: WorkerMessage) => {
  try {
    if (message.type === 'pre-request') {
      parentPort?.postMessage(executePreRequestScript(message.script, message.context));
    } else {
      parentPort?.postMessage(executeTestScript(message.script, message.context));
    }
  } catch (err) {
    parentPort?.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
});
