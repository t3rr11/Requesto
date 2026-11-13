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

import type { EnvironmentVariableType } from 'requesto-backend/models/environment';
import { isNumericLiteral } from 'requesto-backend/utils/variable-substitution';

export type TestResult = { name: string; passed: boolean; error?: string };

export type PreRequestContext = {
  request: { method: string; url: string; headers?: Record<string, string>; body?: string };
  env: Record<string, string>;
  envTypes?: Record<string, EnvironmentVariableType>;
  collectionVariables?: Record<string, string>;
  collectionVariableTypes?: Record<string, EnvironmentVariableType>;
};

export type ScriptFormEntry = { key: string; value: string; type?: 'text' | 'file'; fileName?: string };

export type TestContext = {
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    duration: number;
  };
  request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    formDataEntries?: ScriptFormEntry[];
  };
  env: Record<string, string>;
  envTypes?: Record<string, EnvironmentVariableType>;
  collectionVariables?: Record<string, string>;
  collectionVariableTypes?: Record<string, EnvironmentVariableType>;
};

export type PreRequestOutcome = {
  envOverrides: Record<string, string>;
  /** Inferred type per key in `envOverrides`. */
  envTypes: Record<string, EnvironmentVariableType>;
  /** Keys the script removed via `environment.clear()`. */
  envCleared: string[];
  /** Keys the script set via `collection.set()` (touched keys only). */
  collectionOverrides: Record<string, string>;
  /** Inferred type per key in `collectionOverrides`. */
  collectionTypes: Record<string, EnvironmentVariableType>;
  /** Keys the script removed via `collection.clear()`. */
  collectionCleared: string[];
};
export type TestOutcome = {
  testResults: TestResult[];
  envOverrides: Record<string, string>;
  /** Inferred type per key in `envOverrides`. */
  envTypes: Record<string, EnvironmentVariableType>;
  envCleared: string[];
  collectionOverrides: Record<string, string>;
  collectionTypes: Record<string, EnvironmentVariableType>;
  collectionCleared: string[];
};

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

/**
 * Type a script-set variable from the runtime type of the value passed to
 * `environment.set()`, not from its stringified content. A value that was
 * a JS string stays String-typed even when it looks numeric (e.g. a GraphQL
 * `ID` read out of a response), so it is never silently un-quoted in JSON
 * bodies and GraphQL variables; scripts that want Number/Boolean typing
 * pass actual numbers or booleans (`environment.set('count', 42)`).
 */
function typeOfScriptValue(value: unknown): EnvironmentVariableType {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? 'number' : 'string';
  }
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

/**
 * Parse a stored string value according to its declared type. Values that
 * cannot represent the type (e.g. a Number variable holding `02134`) fall
 * back to the raw string, mirroring the JSON substitution fallback.
 */
function typedValue(value: string, type: EnvironmentVariableType | undefined): string | number | boolean {
  if (type === 'number' && isNumericLiteral(value)) return Number(value);
  if (type === 'boolean' && (value === 'true' || value === 'false')) return value === 'true';
  return value;
}

/**
 * Variable scope behind the `environment` and `collection` script APIs, which
 * expose the same get/set/has/clear shape. `clear` with no key clears every
 * visible variable (Postman semantics); cleared keys resolve to nothing and
 * are tracked so hosts can reset their persisted values after the run.
 */
function createVariableScope(
  base: Record<string, string> | undefined,
  declaredTypes: Record<string, EnvironmentVariableType> | undefined,
) {
  const store: Record<string, string> = { ...base };
  // Types recorded per key set during this run, so callers can re-type variables.
  const types: Record<string, EnvironmentVariableType> = {};
  const touched = new Set<string>();
  const cleared = new Set<string>();

  return {
    store,
    types,
    touched,
    cleared,
    api: {
      get: (key: string): string | number | boolean => {
        if (cleared.has(key)) return '';
        const raw = store[key];
        if (raw === undefined) return '';
        return typedValue(raw, types[key] ?? declaredTypes?.[key]);
      },
      set: (key: string, value: unknown): void => {
        store[key] = String(value);
        types[key] = typeOfScriptValue(value);
        touched.add(key);
        cleared.delete(key);
      },
      has: (key: string): boolean => !cleared.has(key) && Object.hasOwn(store, key),
      clear: (key?: string): void => {
        for (const k of key === undefined ? Object.keys(store) : [key]) {
          cleared.add(k);
        }
      },
    },
  };
}

type ScopedOutcome = {
  overrides: Record<string, string>;
  types: Record<string, EnvironmentVariableType>;
  cleared: string[];
};

/** Cleared keys that exist in the scope: clearing an absent key is a no-op. */
function clearedKeys(scope: ReturnType<typeof createVariableScope>): string[] {
  return [...scope.cleared].filter((key) => Object.hasOwn(scope.store, key));
}

/** Touched keys only: committed values the script never wrote are excluded. */
function touchedScopeOutcome(scope: ReturnType<typeof createVariableScope>): ScopedOutcome {
  const overrides: Record<string, string> = {};
  const types: Record<string, EnvironmentVariableType> = {};
  for (const key of scope.touched) {
    types[key] = scope.types[key];
    if (!scope.cleared.has(key)) overrides[key] = scope.store[key];
  }
  return { overrides, types, cleared: clearedKeys(scope) };
}

/** Every visible key is reported: the environment scope persists its full copy. */
function fullScopeOutcome(scope: ReturnType<typeof createVariableScope>): ScopedOutcome {
  const overrides: Record<string, string> = {};
  for (const [key, value] of Object.entries(scope.store)) {
    if (!scope.cleared.has(key)) overrides[key] = value;
  }
  return { overrides, types: { ...scope.types }, cleared: clearedKeys(scope) };
}

/** Execute a pre-request script. Throws on script errors. */
export function executePreRequestScript(script: string, context: PreRequestContext): PreRequestOutcome {
  const env = createVariableScope(context.env, context.envTypes);
  const collection = createVariableScope(context.collectionVariables, context.collectionVariableTypes);
  const request = { ...context.request };

  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'environment',
    'request',
    'collection',
    `${SHADOWED_GLOBALS}\n${script}`,
  );
  fn(env.api, request, collection.api);

  const envOutcome = fullScopeOutcome(env);
  const col = touchedScopeOutcome(collection);
  return {
    envOverrides: envOutcome.overrides,
    envTypes: envOutcome.types,
    envCleared: envOutcome.cleared,
    collectionOverrides: col.overrides,
    collectionTypes: col.types,
    collectionCleared: col.cleared,
  };
}

/** Execute a test script. Throws on script errors (outside test() blocks). */
export function executeTestScript(script: string, context: TestContext): TestOutcome {
  const results: TestResult[] = [];
  const { response: responseCtx, request: requestCtx } = context;
  const env = createVariableScope(context.env, context.envTypes);
  const collection = createVariableScope(context.collectionVariables, context.collectionVariableTypes);

  const response = {
    status: responseCtx.status,
    statusText: responseCtx.statusText,
    headers: { ...responseCtx.headers },
    body: responseCtx.body,
    duration: responseCtx.duration,
    json: (): unknown => JSON.parse(responseCtx.body),
  };

  let params: Record<string, string> = {};
  try {
    params = Object.fromEntries(new URL(requestCtx.url).searchParams);
  } catch {
    // Not an absolute URL, so no query params can be parsed.
  }

  const form: Record<string, string> = {};
  for (const entry of requestCtx.formDataEntries ?? []) {
    form[entry.key] = entry.type === 'file' ? (entry.fileName ?? '') : entry.value;
  }

  const request = {
    method: requestCtx.method,
    url: requestCtx.url,
    headers: requestCtx.headers ? { ...requestCtx.headers } : undefined,
    body: requestCtx.body,
    params,
    form,
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
  const fn = new Function(
    'test',
    'expect',
    'response',
    'request',
    'environment',
    'collection',
    `${SHADOWED_GLOBALS}\n${script}`,
  );
  fn(test, expect, response, request, env.api, collection.api);

  const envOutcome = fullScopeOutcome(env);
  const col = touchedScopeOutcome(collection);
  return {
    testResults: results,
    envOverrides: envOutcome.overrides,
    envTypes: envOutcome.types,
    envCleared: envOutcome.cleared,
    collectionOverrides: col.overrides,
    collectionTypes: col.types,
    collectionCleared: col.cleared,
  };
}
