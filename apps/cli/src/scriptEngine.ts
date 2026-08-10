import vm from 'node:vm';
import type { TestResult } from './types';

const SCRIPT_TIMEOUT_MS = 5000;

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
    if (inverted ? condition : !condition) {
      throw new Error(inverted ? `Expected NOT: ${message}` : message);
    }
  };

  return {
    toBe: (e) => pass(Object.is(actual, e), `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(e)}`),
    toEqual: (e) => pass(JSON.stringify(actual) === JSON.stringify(e), `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(e)}`),
    toBeTruthy: () => pass(Boolean(actual), `Expected ${JSON.stringify(actual)} to be truthy`),
    toBeFalsy: () => pass(!actual, `Expected ${JSON.stringify(actual)} to be falsy`),
    toContain: (e) => {
      if (Array.isArray(actual)) pass(actual.includes(e), `Expected array to contain ${JSON.stringify(e)}`);
      else if (typeof actual === 'string') pass(actual.includes(String(e)), `Expected "${actual}" to contain "${String(e)}"`);
      else throw new Error('toContain requires an array or string');
    },
    toHaveLength: (e) => {
      const len = (actual as { length?: number })?.length;
      pass(len === e, `Expected length ${String(len)} to equal ${String(e)}`);
    },
    toBeGreaterThan: (e) => pass((actual as number) > e, `Expected ${String(actual)} to be > ${String(e)}`),
    toBeLessThan: (e) => pass((actual as number) < e, `Expected ${String(actual)} to be < ${String(e)}`),
    toBeGreaterThanOrEqual: (e) => pass((actual as number) >= e, `Expected ${String(actual)} to be >= ${String(e)}`),
    toBeLessThanOrEqual: (e) => pass((actual as number) <= e, `Expected ${String(actual)} to be <= ${String(e)}`),
    toMatch: (pattern) => {
      const re = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      pass(re.test(String(actual)), `Expected "${String(actual)}" to match ${String(re)}`);
    },
    toBeNull: () => pass(actual === null, `Expected ${JSON.stringify(actual)} to be null`),
    toBeUndefined: () => pass(actual === undefined, `Expected value to be undefined`),
    toBeDefined: () => pass(actual !== undefined, `Expected value to be defined`),
    get not() { return createExpect(actual, !inverted); },
  };
}

export interface ScriptResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}

/**
 * Run a pre-request script in a sandboxed vm context.
 * Returns the full env store after the script (any set() calls are included).
 */
export function runPreRequestScript(
  script: string,
  envStore: Record<string, string>,
  request: { method: string; url: string; headers?: Record<string, string>; body?: string },
): Record<string, string> {
  if (!script.trim()) return { ...envStore };

  const mutableEnv = { ...envStore };
  const context = vm.createContext({
    environment: {
      get: (key: string): string => mutableEnv[key] ?? '',
      set: (key: string, value: string): void => { mutableEnv[key] = String(value); },
    },
    request: { ...request },
    // Safe built-ins for scripts
    console: { log: console.log, error: console.error, warn: console.warn },
    JSON,
    Math,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  });

  try {
    vm.runInContext(script, context, { timeout: SCRIPT_TIMEOUT_MS });
  } catch (err) {
    throw new Error(`Pre-request script error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return mutableEnv;
}

/**
 * Run a test script in a sandboxed vm context.
 * Returns test results and the env store after the script.
 */
export function runTestScript(
  script: string,
  response: ScriptResponse,
  request: { method: string; url: string; headers?: Record<string, string>; body?: string },
  envStore: Record<string, string>,
): { testResults: TestResult[]; envStore: Record<string, string> } {
  if (!script.trim()) return { testResults: [], envStore: { ...envStore } };

  const testResults: TestResult[] = [];
  const mutableEnv = { ...envStore };

  const context = vm.createContext({
    test: (name: string, fn: () => void): void => {
      try {
        fn();
        testResults.push({ name, passed: true });
      } catch (err) {
        testResults.push({ name, passed: false, error: err instanceof Error ? err.message : String(err) });
      }
    },
    expect: (actual: unknown): Expectation => createExpect(actual),
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: { ...response.headers },
      body: response.body,
      duration: response.duration,
      json: (): unknown => JSON.parse(response.body),
    },
    request: { ...request },
    environment: {
      get: (key: string): string => mutableEnv[key] ?? '',
      set: (key: string, value: string): void => { mutableEnv[key] = String(value); },
    },
    console: { log: console.log, error: console.error, warn: console.warn },
    JSON,
    Math,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  });

  try {
    vm.runInContext(script, context, { timeout: SCRIPT_TIMEOUT_MS });
  } catch (err) {
    testResults.push({
      name: 'Script execution',
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return { testResults, envStore: mutableEnv };
}
