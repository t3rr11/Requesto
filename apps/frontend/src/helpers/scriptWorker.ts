/**
 * Script Worker — runs in an isolated Web Worker context.
 *
 * No DOM, no window, no Zustand stores are accessible here. All inputs
 * arrive via postMessage as plain JSON-serialisable objects and results
 * are returned the same way.
 *
 * The script API itself (expect matchers, test/environment/request/response
 * globals, shadowed globals) is the shared sandbox core in requesto-engine,
 * the same code that headless CLI runs execute.
 */

import { executePreRequestScript, executeTestScript } from 'requesto-engine/sandbox-core';

type PreRequestContext = Parameters<typeof executePreRequestScript>[1];
type TestContext = Parameters<typeof executeTestScript>[1];

type WorkerMessage =
  | { type: 'pre-request'; script: string; context: PreRequestContext }
  | { type: 'test'; script: string; context: TestContext };

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, script, context } = event.data;

  try {
    if (type === 'pre-request') {
      self.postMessage(executePreRequestScript(script, context));
    } else {
      self.postMessage(executeTestScript(script, context));
    }
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
