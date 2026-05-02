/**
 * Script Worker — runs in an isolated Web Worker context.
 *
 * No DOM, no window, no Zustand stores are accessible here.
 * All inputs arrive via postMessage as plain JSON-serialisable objects,
 * and results are returned the same way.
 *
 * Dangerous Worker globals (self, fetch, XMLHttpRequest, importScripts,
 * globalThis) are shadowed inside the user script closure so they cannot
 * be exploited by script authors.
 */

type TestResult = { name: string; passed: boolean; error?: string };

// Shadowed globals prepended to every user script.
// These shadow the Worker-global equivalents so user scripts cannot
// reach fetch, self, importScripts, etc.
const SHADOWED_GLOBALS = `
"use strict";
const self = undefined;
const fetch = undefined;
const XMLHttpRequest = undefined;
const importScripts = undefined;
const globalThis = undefined;
`;

type Expectation = {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
  toBeGreaterThan(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toMatch(pattern: string | RegExp): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  not: Expectation;
};

function createExpect(actual: unknown, inverted = false): Expectation {
  const pass = (condition: boolean, message: string): void => {
    const fails = inverted ? condition : !condition;
    if (fails) throw new Error(inverted ? `Expected NOT: ${message}` : message);
  };

  return {
    toBe: (expected) =>
      pass(Object.is(actual, expected), `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`),

    toEqual: (expected) =>
      pass(
        JSON.stringify(actual) === JSON.stringify(expected),
        `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`,
      ),

    toBeTruthy: () => pass(Boolean(actual), `Expected ${JSON.stringify(actual)} to be truthy`),

    toBeFalsy: () => pass(!actual, `Expected ${JSON.stringify(actual)} to be falsy`),

    toContain: (expected) => {
      if (Array.isArray(actual)) {
        pass(actual.includes(expected), `Expected array to contain ${JSON.stringify(expected)}`);
      } else if (typeof actual === 'string') {
        pass(actual.includes(String(expected)), `Expected "${actual}" to contain "${String(expected)}"`);
      } else {
        throw new Error('toContain requires an array or string');
      }
    },

    toHaveLength: (expected) => {
      const len = (actual as { length?: number })?.length;
      pass(len === expected, `Expected length ${String(len)} to equal ${String(expected)}`);
    },

    toBeGreaterThan: (expected) =>
      pass((actual as number) > expected, `Expected ${String(actual)} to be greater than ${String(expected)}`),

    toBeLessThan: (expected) =>
      pass((actual as number) < expected, `Expected ${String(actual)} to be less than ${String(expected)}`),

    toBeGreaterThanOrEqual: (expected) =>
      pass((actual as number) >= expected, `Expected ${String(actual)} to be >= ${String(expected)}`),

    toBeLessThanOrEqual: (expected) =>
      pass((actual as number) <= expected, `Expected ${String(actual)} to be <= ${String(expected)}`),

    toMatch: (pattern) => {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      pass(regex.test(String(actual)), `Expected "${String(actual)}" to match ${String(regex)}`);
    },

    toBeNull: () => pass(actual === null, `Expected ${JSON.stringify(actual)} to be null`),

    toBeUndefined: () => pass(actual === undefined, `Expected ${JSON.stringify(actual)} to be undefined`),

    toBeDefined: () => pass(actual !== undefined, `Expected ${JSON.stringify(actual)} to be defined`),

    get not() {
      return createExpect(actual, !inverted);
    },
  };
}

type PreRequestContext = {
  request: { method: string; url: string; headers?: Record<string, string>; body?: string };
  env: Record<string, string>;
};

type TestContext = {
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    duration: number;
  };
  request: { method: string; url: string; headers?: Record<string, string>; body?: string };
  env: Record<string, string>;
};

type WorkerMessage =
  | { type: 'pre-request'; script: string; context: PreRequestContext }
  | { type: 'test'; script: string; context: TestContext };

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, script, context } = event.data;

  try {
    if (type === 'pre-request') {
      const envStore: Record<string, string> = { ...context.env };

      const environment = {
        get: (key: string): string => envStore[key] ?? '',
        set: (key: string, value: string): void => {
          envStore[key] = String(value);
        },
      };

      const request = { ...context.request };

      // eslint-disable-next-line no-new-func
      const fn = new Function('environment', 'request', `${SHADOWED_GLOBALS}\n${script}`);
      fn(environment, request);

      self.postMessage({ envOverrides: envStore });
    } else if (type === 'test') {
      const results: TestResult[] = [];
      const { response: responseCtx, request } = context;
      const envStore: Record<string, string> = { ...context.env };

      const environment = {
        get: (key: string): string => envStore[key] ?? '',
        set: (key: string, value: string): void => {
          envStore[key] = String(value);
        },
      };

      const response = {
        status: responseCtx.status,
        statusText: responseCtx.statusText,
        headers: { ...responseCtx.headers },
        body: responseCtx.body,
        duration: responseCtx.duration,
        json: (): unknown => JSON.parse(responseCtx.body),
      };

      const test = (name: string, fn: () => void): void => {
        try {
          fn();
          results.push({ name, passed: true });
        } catch (err) {
          results.push({
            name,
            passed: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      };

      const expect = (actual: unknown): Expectation => createExpect(actual);

      // eslint-disable-next-line no-new-func
      const fn = new Function('test', 'expect', 'response', 'request', 'environment', `${SHADOWED_GLOBALS}\n${script}`);
      fn(test, expect, response, request, environment);

      self.postMessage({ testResults: results, envOverrides: envStore });
    }
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
