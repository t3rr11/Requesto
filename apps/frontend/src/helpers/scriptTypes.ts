/**
 * Monaco Editor ambient TypeScript declarations for Requesto script contexts.
 *
 * Two separate type libraries are exported — one for each script editor — so
 * IntelliSense only surfaces the globals that are actually available in that
 * context.
 *
 * The script editors set `noLib: true` in Monaco's compiler options so the
 * browser / DOM types are excluded. The minimal built-ins below replace the
 * parts of the standard lib that are useful inside scripts.
 */

/**
 * Minimal JavaScript built-ins needed inside scripts.
 * Keeps completions useful without polluting the list with browser / DOM APIs.
 */
const MINIMAL_BUILTINS = `
/// <reference no-default-lib="true"/>

interface Boolean {}
interface Function {}
interface IArguments {}
interface Number { toFixed(digits?: number): string; toString(radix?: number): string; }
interface String {
  length: number;
  trim(): string;
  trimStart(): string;
  trimEnd(): string;
  toLowerCase(): string;
  toUpperCase(): string;
  includes(searchString: string, position?: number): boolean;
  startsWith(searchString: string, position?: number): boolean;
  endsWith(searchString: string, position?: number): boolean;
  indexOf(searchString: string, position?: number): number;
  slice(start?: number, end?: number): string;
  split(separator: string | RegExp, limit?: number): string[];
  replace(searchValue: string | RegExp, replaceValue: string): string;
  charAt(pos: number): string;
  charCodeAt(index: number): number;
  substring(start: number, end?: number): string;
  padStart(maxLength: number, fillString?: string): string;
  padEnd(maxLength: number, fillString?: string): string;
  match(regexp: string | RegExp): RegExpMatchArray | null;
}
interface RegExp {}
interface RegExpMatchArray extends Array<string> { index?: number; }
interface TemplateStringsArray extends ReadonlyArray<string> {}
interface Symbol {}

declare type PropertyKey = string | number | symbol;
interface PropertyDescriptor {}
interface PropertyDescriptorMap { [key: string]: PropertyDescriptor; }

interface Object {
  hasOwnProperty(v: PropertyKey): boolean;
  toString(): string;
}
declare var Object: {
  new(value?: unknown): Object;
  keys(o: object): string[];
  values<T>(o: { [s: string]: T } | ArrayLike<T>): T[];
  entries<T>(o: { [s: string]: T } | ArrayLike<T>): [string, T][];
  assign<T extends object, U>(target: T, source: U): T & U;
  fromEntries<T>(entries: Iterable<readonly [PropertyKey, T]>): { [k: string]: T };
  hasOwn(o: object, v: PropertyKey): boolean;
};

interface Array<T> {
  length: number;
  push(...items: T[]): number;
  pop(): T | undefined;
  shift(): T | undefined;
  unshift(...items: T[]): number;
  slice(start?: number, end?: number): T[];
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  indexOf(searchElement: T, fromIndex?: number): number;
  includes(searchElement: T, fromIndex?: number): boolean;
  find<S extends T>(predicate: (value: T, index: number, obj: T[]) => value is S): S | undefined;
  findIndex(predicate: (value: T, index: number, obj: T[]) => unknown): number;
  filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S): S[];
  filter(predicate: (value: T, index: number, array: T[]) => unknown): T[];
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
  forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  some(predicate: (value: T, index: number, array: T[]) => unknown): boolean;
  every(predicate: (value: T, index: number, array: T[]) => unknown): boolean;
  flat<A, D extends number = 1>(this: A, depth?: D): unknown[];
  flatMap<U>(callback: (value: T, index: number, array: T[]) => U | U[]): U[];
  join(separator?: string): string;
  reverse(): T[];
  sort(compareFn?: (a: T, b: T) => number): this;
  concat(...items: (T | ConcatArray<T>)[]): T[];
}
interface ConcatArray<T> {}
interface ReadonlyArray<T> {
  readonly length: number;
  indexOf(searchElement: T, fromIndex?: number): number;
  includes(searchElement: T, fromIndex?: number): boolean;
  filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S): S[];
  filter(predicate: (value: T, index: number, array: readonly T[]) => unknown): T[];
  map<U>(callbackfn: (value: T, index: number, array: readonly T[]) => U): U[];
  forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void): void;
  find<S extends T>(predicate: (value: T, index: number, obj: readonly T[]) => value is S): S | undefined;
  findIndex(predicate: (value: T, index: number, obj: readonly T[]) => unknown): number;
  some(predicate: (value: T, index: number, array: readonly T[]) => unknown): boolean;
  every(predicate: (value: T, index: number, array: readonly T[]) => unknown): boolean;
  [n: number]: T;
}
declare var Array: {
  new<T>(arrayLength?: number): T[];
  isArray(arg: unknown): arg is Array<unknown>;
  from<T>(arrayLike: ArrayLike<T>): T[];
  from<T, U>(arrayLike: ArrayLike<T>, mapfn: (v: T, k: number) => U): U[];
  of<T>(...items: T[]): T[];
};
interface ArrayLike<T> { readonly length: number; readonly [n: number]: T; }
interface Iterable<T> {}

declare var JSON: {
  parse(text: string): unknown;
  stringify(value: unknown, replacer?: null, space?: string | number): string;
};

interface DateConstructor {
  new(): Date;
  new(value: number | string): Date;
  now(): number;
  parse(s: string): number;
}
interface Date {
  getTime(): number;
  toISOString(): string;
  toLocaleDateString(): string;
  toLocaleTimeString(): string;
  toLocaleString(): string;
  toString(): string;
  valueOf(): number;
}
declare var Date: DateConstructor;

declare var Math: {
  abs(x: number): number;
  ceil(x: number): number;
  floor(x: number): number;
  round(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
  pow(x: number, y: number): number;
  sqrt(x: number): number;
  random(): number;
  PI: number;
};

declare var parseInt: (string: string, radix?: number) => number;
declare var parseFloat: (string: string) => number;
declare var isNaN: (number: unknown) => boolean;
declare var isFinite: (number: unknown) => boolean;
declare var encodeURIComponent: (uriComponent: string | number | boolean) => string;
declare var decodeURIComponent: (encodedURI: string) => string;
declare var encodeURI: (uri: string) => string;
declare var decodeURI: (encodedURI: string) => string;
declare var btoa: (data: string) => string;
declare var atob: (data: string) => string;
declare var console: { log(...data: unknown[]): void; warn(...data: unknown[]): void; error(...data: unknown[]): void; };

declare type Partial<T> = { [P in keyof T]?: T[P] };
declare type Required<T> = { [P in keyof T]-?: T[P] };
declare type Readonly<T> = { readonly [P in keyof T]: T[P] };
declare type Record<K extends keyof any, T> = { [P in K]: T };
declare type Pick<T, K extends keyof T> = { [P in K]: T[P] };
declare type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
declare type Exclude<T, U> = T extends U ? never : T;
declare type Extract<T, U> = T extends U ? T : never;
declare type NonNullable<T> = T extends null | undefined ? never : T;
declare type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

interface PromiseLike<T> { then<TResult>(onfulfilled: (value: T) => TResult | PromiseLike<TResult>): PromiseLike<TResult>; }
interface Promise<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null): Promise<T | TResult>;
  finally(onfinally?: (() => void) | null): Promise<T>;
}
declare var Promise: {
  new<T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void): Promise<T>;
  resolve<T>(value: T | PromiseLike<T>): Promise<T>;
  reject<T = never>(reason?: unknown): Promise<T>;
  all<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>[]>;
  allSettled<T>(values: Iterable<T | PromiseLike<T>>): Promise<PromiseSettledResult<Awaited<T>>[]>;
};
declare type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
declare type PromiseSettledResult<T> = { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown };

declare var undefined: undefined;
declare var null: null;
declare var true: true;
declare var false: false;

type unknown = unknown;
type never = never;
type any = any;
type void = void;
`;

/** Injected into the "Tests" script editor. */
export const TEST_SCRIPT_TYPES = MINIMAL_BUILTINS + `
interface Expectation<T> {
  /** Assert strict equality using Object.is */
  toBe(expected: T): void;
  /** Assert deep equality via JSON comparison */
  toEqual(expected: T): void;
  /** Assert that the value is truthy */
  toBeTruthy(): void;
  /** Assert that the value is falsy */
  toBeFalsy(): void;
  /** Assert that an array or string contains the given item/substring */
  toContain(expected: T extends Array<infer U> ? U : string): void;
  /** Assert that the value has the given .length */
  toHaveLength(expected: number): void;
  /** Assert that a number is greater than the expected value */
  toBeGreaterThan(expected: number): void;
  /** Assert that a number is less than the expected value */
  toBeLessThan(expected: number): void;
  /** Assert that a number is >= the expected value */
  toBeGreaterThanOrEqual(expected: number): void;
  /** Assert that a number is <= the expected value */
  toBeLessThanOrEqual(expected: number): void;
  /** Assert that a string matches the given pattern */
  toMatch(pattern: string | RegExp): void;
  /** Assert that the value is null */
  toBeNull(): void;
  /** Assert that the value is undefined */
  toBeUndefined(): void;
  /** Assert that the value is not undefined */
  toBeDefined(): void;
  /** Negate the following assertion */
  not: Expectation<T>;
}

/** Create an assertion for the given value. */
declare function expect<T>(actual: T): Expectation<T>;

/**
 * Define a named test. The callback runs synchronously — if it throws the
 * test is marked as failed.
 *
 * @example
 * test("status is 200", () => {
 *   expect(response.status).toBe(200);
 * });
 */
declare function test(name: string, fn: () => void): void;

/** The HTTP response received from the server. */
declare const response: {
  /** HTTP status code, e.g. 200, 404 */
  status: number;
  /** HTTP status text, e.g. "OK", "Not Found" */
  statusText: string;
  /** Response headers as a key/value map */
  headers: Record<string, string>;
  /** Raw response body as a string */
  body: string;
  /** Response time in milliseconds */
  duration: number;
  /** Parse the response body as JSON and return it */
  json(): unknown;
};

/** The outgoing HTTP request that was sent. */
declare const request: {
  /** HTTP method, e.g. "GET", "POST" */
  method: string;
  /** Full request URL */
  url: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (JSON string or undefined) */
  body?: string;
};
`;

/** Injected into the "Pre-request" script editor. */
export const PRE_REQUEST_SCRIPT_TYPES = MINIMAL_BUILTINS + `
/** Read and write environment variables for the active environment. */
declare const environment: {
  /**
   * Get an environment variable by key.
   * Returns an empty string if the variable is not set.
   *
   * @example
   * const token = environment.get("authToken");
   */
  get(key: string): string;
  /**
   * Set an environment variable. The value is available immediately for
   * variable substitution in this request (e.g. in the URL or headers).
   *
   * @example
   * environment.set("timestamp", Date.now().toString());
   */
  set(key: string, value: string): void;
};

/** The outgoing HTTP request. Headers can be mutated before the request is sent. */
declare const request: {
  /** HTTP method, e.g. "GET", "POST" */
  method: string;
  /** Full request URL */
  url: string;
  /** Request headers — you may add or modify entries here */
  headers?: Record<string, string>;
  /** Request body (JSON string or undefined) */
  body?: string;
};
`;
