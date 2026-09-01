/**
 * Script sandbox core: runs user scripts in an isolated scope.
 *
 * This is the single implementation of the script API shared by the app
 * (browser Web Worker wrapper) and headless runs (Node worker thread
 * wrapper). Host-specific globals are shadowed via the preamble so user
 * scripts cannot reach fetch, process, require, etc.
 *
 * All inputs arrive as plain JSON-serialisable objects and results are
 * returned the same way: the host wrappers do the worker plumbing.
 */

export type TestResult = { name: string; passed: boolean; error?: string };

export type PreRequestContext = {
  request: { method: string; url: string; headers?: Record<string, string>; body?: string };
  env: Record<string, string>;
};

export type TestContext = {
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

export type PreRequestOutcome = { envOverrides: Record<string, string> };
export type TestOutcome = { testResults: TestResult[]; envOverrides: Record<string, string> };

// Shadowed globals prepended to every user script. These shadow the
// global equivalents so user scripts cannot reach fetch, process,
// require, etc. Browser hosts have no process/require/Buffer: shadowing
// them there is harmless.
const SHADOWED_GLOBALS = `
"use strict";
const self = undefined;
const fetch = undefined;
const XMLHttpRequest = undefined;
const importScripts = undefined;
const globalThis = undefined;
const global = undefined;
const process = undefined;
const require = undefined;
const Buffer = undefined;
const module = undefined;
const exports = undefined;
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

function createEnvironment(env: Record<string, string>) {
  const envStore: Record<string, string> = { ...env };
  return {
    store: envStore,
    api: {
      get: (key: string): string => envStore[key] ?? '',
      set: (key: string, value: string): void => {
        envStore[key] = String(value);
      },
    },
  };
}

/** Execute a pre-request script. Throws on script errors. */
export function executePreRequestScript(script: string, context: PreRequestContext): PreRequestOutcome {
  const { store, api } = createEnvironment(context.env);
  const request = { ...context.request };

  // eslint-disable-next-line no-new-func
  const fn = new Function('environment', 'request', `${SHADOWED_GLOBALS}\n${script}`);
  fn(api, request);

  return { envOverrides: store };
}

/** Execute a test script. Throws on script errors (outside test() blocks). */
export function executeTestScript(script: string, context: TestContext): TestOutcome {
  const results: TestResult[] = [];
  const { response: responseCtx, request } = context;
  const { store, api } = createEnvironment(context.env);

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
  fn(test, expect, response, request, api);

  return { testResults: results, envOverrides: store };
}
