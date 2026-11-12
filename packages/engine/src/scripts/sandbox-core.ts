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
  folderVariables?: Record<string, string>;
  folderVariableTypes?: Record<string, EnvironmentVariableType>;
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
  folderVariables?: Record<string, string>;
  folderVariableTypes?: Record<string, EnvironmentVariableType>;
};

export type PreRequestOutcome = {
  envOverrides: Record<string, string>;
  /** Inferred type per key in `envOverrides`. */
  envTypes: Record<string, EnvironmentVariableType>;
  /** Keys the script set via `collectionVariables.set()` (touched keys only). */
  collectionOverrides: Record<string, string>;
  /** Inferred type per key in `collectionOverrides`. */
  collectionTypes: Record<string, EnvironmentVariableType>;
  /** Keys the script removed via `collectionVariables.clear()`. */
  collectionCleared: string[];
  /** Keys the script set via `folderVariables.set()` (touched keys only). */
  folderOverrides: Record<string, string>;
  /** Inferred type per key in `folderOverrides`. */
  folderTypes: Record<string, EnvironmentVariableType>;
  /** Keys the script removed via `folderVariables.clear()`. */
  folderCleared: string[];
};
export type TestOutcome = {
  testResults: TestResult[];
  envOverrides: Record<string, string>;
  /** Inferred type per key in `envOverrides`. */
  envTypes: Record<string, EnvironmentVariableType>;
  collectionOverrides: Record<string, string>;
  collectionTypes: Record<string, EnvironmentVariableType>;
  collectionCleared: string[];
  folderOverrides: Record<string, string>;
  folderTypes: Record<string, EnvironmentVariableType>;
  folderCleared: string[];
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

function createEnvironment(env: Record<string, string>, declaredTypes?: Record<string, EnvironmentVariableType>) {
  const envStore: Record<string, string> = { ...env };
  // Types recorded per key set during this run, so callers can re-type variables.
  const typeStore: Record<string, EnvironmentVariableType> = {};
  return {
    store: envStore,
    types: typeStore,
    api: {
      get: (key: string): string | number | boolean => {
        const raw = envStore[key];
        if (raw === undefined) return '';
        return typedValue(raw, typeStore[key] ?? declaredTypes?.[key]);
      },
      set: (key: string, value: unknown): void => {
        envStore[key] = String(value);
        typeStore[key] = typeOfScriptValue(value);
      },
    },
  };
}

/**
 * Script-visible variables for one scope (collection or folder). Unlike the
 * environment store, only keys the script actually touched are reported as
 * overrides; cleared keys are tracked separately so the base value does not
 * resurface in them.
 */
function createScopedVariables(
  base: Record<string, string> | undefined,
  declaredTypes: Record<string, EnvironmentVariableType> | undefined,
) {
  const store: Record<string, string> = { ...base };
  const types: Record<string, EnvironmentVariableType> = {};
  const touched = new Set<string>();
  const cleared = new Set<string>();

  return {
    store,
    types,
    touched,
    cleared,
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
  };
}

type ScopedOutcome = {
  overrides: Record<string, string>;
  types: Record<string, EnvironmentVariableType>;
  cleared: string[];
};

/** Touched keys only: committed values the script never wrote are excluded. */
function scopedOutcome(scope: ReturnType<typeof createScopedVariables>): ScopedOutcome {
  const overrides: Record<string, string> = {};
  const types: Record<string, EnvironmentVariableType> = {};
  for (const key of scope.touched) {
    types[key] = scope.types[key];
    if (!scope.cleared.has(key)) overrides[key] = scope.store[key];
  }
  return {
    overrides,
    types,
    cleared: [...scope.cleared].filter((key) => Object.hasOwn(scope.store, key)),
  };
}

/**
 * The collection and folder variable APIs shared by pre-request and test
 * scripts. `folderVariables` is read/write only by design; `clear` with no
 * argument clears every visible variable (Postman semantics).
 */
function createScopedApis(context: PreRequestContext | TestContext) {
  const collection = createScopedVariables(context.collectionVariables, context.collectionVariableTypes);
  const folder = createScopedVariables(context.folderVariables, context.folderVariableTypes);
  return {
    collection,
    folder,
    collectionApi: {
      get: collection.get,
      set: collection.set,
      has: (key: string): boolean => !collection.cleared.has(key) && Object.hasOwn(collection.store, key),
      clear: (key?: string): void => {
        for (const k of key === undefined ? Object.keys(collection.store) : [key]) {
          collection.cleared.add(k);
        }
      },
    },
    folderApi: { get: folder.get, set: folder.set },
  };
}

/** Execute a pre-request script. Throws on script errors. */
export function executePreRequestScript(script: string, context: PreRequestContext): PreRequestOutcome {
  const { store, types, api } = createEnvironment(context.env, context.envTypes);
  const { collection, folder, collectionApi, folderApi } = createScopedApis(context);
  const request = { ...context.request };

  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'environment',
    'request',
    'collectionVariables',
    'folderVariables',
    `${SHADOWED_GLOBALS}\n${script}`,
  );
  fn(api, request, collectionApi, folderApi);

  const env = { envOverrides: store, envTypes: types };
  const col = scopedOutcome(collection);
  const fol = scopedOutcome(folder);
  return {
    ...env,
    collectionOverrides: col.overrides,
    collectionTypes: col.types,
    collectionCleared: col.cleared,
    folderOverrides: fol.overrides,
    folderTypes: fol.types,
    folderCleared: fol.cleared,
  };
}

/** Execute a test script. Throws on script errors (outside test() blocks). */
export function executeTestScript(script: string, context: TestContext): TestOutcome {
  const results: TestResult[] = [];
  const { response: responseCtx, request: requestCtx } = context;
  const { store, types, api } = createEnvironment(context.env, context.envTypes);
  const { collection, folder, collectionApi, folderApi } = createScopedApis(context);

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
    // Not an absolute URL — no query params can be parsed.
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
    'collectionVariables',
    'folderVariables',
    `${SHADOWED_GLOBALS}\n${script}`,
  );
  fn(test, expect, response, request, api, collectionApi, folderApi);

  const env = { envOverrides: store, envTypes: types };
  const col = scopedOutcome(collection);
  const fol = scopedOutcome(folder);
  return {
    testResults: results,
    ...env,
    collectionOverrides: col.overrides,
    collectionTypes: col.types,
    collectionCleared: col.cleared,
    folderOverrides: fol.overrides,
    folderTypes: fol.types,
    folderCleared: fol.cleared,
  };
}
