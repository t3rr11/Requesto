import type { Collection, Folder } from '../store/collections/types';
import type { Environment, EnvironmentVariable, EnvironmentVariableType } from '../store/environments/types';
import type { AuthConfig, ProxyRequest } from '../store/request/types';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type VariableScope = {
  variables: EnvironmentVariable[];
};

export type ScriptScopeOverrides = {
  values: Record<string, string>;
  types?: Record<string, EnvironmentVariableType>;
  cleared?: string[];
};

export type ScriptOverrideSet = {
  env?: ScriptScopeOverrides;
  collection?: ScriptScopeOverrides;
  folders?: Record<string, ScriptScopeOverrides>;
};

/**
 * Merge a script's overrides into an accumulator so the outcome order within
 * a run decides the final state: a later `set` revives a key cleared earlier,
 * a later `clear` drops a key set earlier. Mutates `target`.
 */
export function mergeScriptOverrides(
  target: ScriptScopeOverrides,
  source: { values: Record<string, string>; types?: Record<string, EnvironmentVariableType>; cleared?: string[] },
): void {
  const values = { ...target.values, ...source.values };
  const cleared = new Set([...(target.cleared ?? []), ...(source.cleared ?? [])]);

  // A set in this outcome revives a key cleared earlier, in the same or an earlier script.
  for (const key of Object.keys(source.values)) cleared.delete(key);
  for (const key of cleared) delete values[key];
  target.values = values;
  target.types = { ...target.types, ...source.types };
  target.cleared = [...cleared];
}

/** Layer one scope's script overrides onto that scope's variable list. */
function applyScriptOverrides(variables: EnvironmentVariable[], overrides?: ScriptScopeOverrides): EnvironmentVariable[] {
  if (!overrides) return variables;
  const cleared = new Set(overrides.cleared ?? []);
  const applied = variables
    .filter(v => v.enabled && v.key && !cleared.has(v.key))
    .map(v =>
      Object.prototype.hasOwnProperty.call(overrides.values, v.key)
        ? { ...v, currentValue: overrides.values[v.key], type: overrides.types?.[v.key] ?? v.type }
        : v,
    );
  for (const [key, value] of Object.entries(overrides.values)) {
    if (!applied.some(v => v.key === key)) {
      applied.push({ key, value, currentValue: value, enabled: true, type: overrides.types?.[key] ?? 'string' });
    }
  }
  return applied;
}

/**
 * `effectiveVariables` with script-set overrides applied to their own scope
 * before merging, so a script-set collection value still loses to an
 * environment value of the same key.
 */
export function effectiveVariablesWithOverrides(
  environment: Environment | null,
  collection?: Collection | null,
  folderChain?: Folder[],
  overrides?: ScriptOverrideSet,
): VariableScope {
  const scopes: EnvironmentVariable[][] = [
    applyScriptOverrides(collection?.variables ?? [], overrides?.collection),
    ...(folderChain ?? []).map(folder => applyScriptOverrides(folder.variables ?? [], overrides?.folders?.[folder.id])),
    applyScriptOverrides(environment?.variables ?? [], overrides?.env),
  ];

  const byKey = new Map<string, EnvironmentVariable>();
  for (const variables of scopes) {
    for (const variable of variables) {
      if (!variable.enabled || !variable.key) continue;
      byKey.set(variable.key, variable);
    }
  }
  return { variables: [...byKey.values()] };
}

/**
 * Merge variable scopes into one effective list, highest precedence last
 * (later entries win per key): collection, then folders outermost to
 * innermost, then the active environment. Disabled variables are dropped so
 * a lower scope can still resolve the key.
 */
export function effectiveVariables(
  environment: Environment | null,
  collection?: Collection | null,
  folderChain?: Folder[],
): VariableScope {
  return effectiveVariablesWithOverrides(environment, collection, folderChain);
}

/** Folder-chain script overrides merged innermost-wins (inner folders last). */
function mergedFolderOverrides(
  folderChain: Folder[],
  folders?: Record<string, ScriptScopeOverrides>,
): ScriptScopeOverrides | undefined {
  if (!folders) return undefined;
  const merged: ScriptScopeOverrides = { values: {} };
  for (const folder of folderChain) {
    const overrides = folders[folder.id];
    if (overrides) mergeScriptOverrides(merged, overrides);
  }
  return Object.keys(merged.values).length > 0 || (merged.cleared?.length ?? 0) > 0 ? merged : undefined;
}

/** Enabled values of one scope, with script-set overrides applied on top. */
function scopeValuesRecord(
  variables: EnvironmentVariable[],
  overrides?: ScriptScopeOverrides,
): Record<string, string> {
  const cleared = new Set(overrides?.cleared ?? []);
  const record: Record<string, string> = {};
  for (const variable of variables) {
    if (!variable.enabled || !variable.key || cleared.has(variable.key)) continue;
    record[variable.key] =
      overrides && Object.prototype.hasOwnProperty.call(overrides.values, variable.key)
        ? overrides.values[variable.key]
        : variable.currentValue ?? variable.value;
  }
  for (const [key, value] of Object.entries(overrides?.values ?? {})) {
    if (!cleared.has(key)) record[key] = value;
  }
  return record;
}

/** Declared types of one scope, with script-recorded types layered on top. */
function scopeTypesRecord(
  variables: EnvironmentVariable[],
  overrides?: ScriptScopeOverrides,
): Record<string, EnvironmentVariableType> | undefined {
  const types: Record<string, EnvironmentVariableType> = {};
  for (const variable of variables) {
    if (variable.enabled && variable.type) types[variable.key] = variable.type;
  }
  Object.assign(types, overrides?.types);
  return Object.keys(types).length > 0 ? types : undefined;
}

/**
 * The collection and folder variable records a script sandbox sees:
 * enabled values (current values applied), script-set overrides layered on
 * top, cleared keys removed, folder chain merged innermost-wins.
 */
export function scriptVariableRecords(
  collection?: Collection | null,
  folderChain?: Folder[],
  overrides?: Pick<ScriptOverrideSet, 'collection' | 'folders'>,
): {
  collectionVariables: Record<string, string>;
  collectionVariableTypes?: Record<string, EnvironmentVariableType>;
  folderVariables: Record<string, string>;
  folderVariableTypes?: Record<string, EnvironmentVariableType>;
} {
  const collectionVars = collection?.variables ?? [];
  const folderVars = (folderChain ?? []).flatMap(folder => folder.variables ?? []);
  const folderOverrides = mergedFolderOverrides(folderChain ?? [], overrides?.folders);
  return {
    collectionVariables: scopeValuesRecord(collectionVars, overrides?.collection),
    collectionVariableTypes: scopeTypesRecord(collectionVars, overrides?.collection),
    folderVariables: scopeValuesRecord(folderVars, folderOverrides),
    folderVariableTypes: scopeTypesRecord(folderVars, folderOverrides),
  };
}

/**
 * Folder chain for a request's folder, outermost to innermost (the order
 * `effectiveVariables` expects). Empty for root-level requests.
 */
export function folderChainFor(collection: Collection | null | undefined, folderId?: string): Folder[] {
  if (!collection || !folderId) return [];
  const chain: Folder[] = [];
  let current = collection.folders.find(folder => folder.id === folderId);
  while (current) {
    chain.unshift(current);
    const parentId = current.parentId;
    current = parentId ? collection.folders.find(folder => folder.id === parentId) : undefined;
  }
  return chain;
}

/**
 * Replace `{{variableName}}` placeholders with values from the active variable scope.
 */
export function substituteVariables(text: string, scope: VariableScope | null): string {
  if (!scope || !text) return text;

  let result = text;
  for (const variable of scope.variables) {
    if (variable.enabled && variable.key) {
      const pattern = new RegExp(`{{\\s*${escapeRegExp(variable.key)}\\s*}}`, 'g');
      // currentValue (set by pre-request scripts) takes precedence over value (initial)
      result = result.replace(pattern, variable.currentValue ?? variable.value ?? '');
    }
  }
  return result;
}

/** Strict JSON number literal check; unlike Number(), rejects NaN, Infinity, hex and leading zeros. */
export function isNumericLiteral(value: string): boolean {
  return /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(value.trim());
}

/** Infer a variable type from a runtime or literal-string value. */
export function inferType(value: unknown): EnvironmentVariableType {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? 'number' : 'string';
  }
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    if (value === 'true' || value === 'false') return 'boolean';
    if (isNumericLiteral(value)) return 'number';
  }
  return 'string';
}

function typedJsonLiteral(
  value: string,
  type: EnvironmentVariableType | undefined,
): string | null {
  if (type === 'boolean') {
    return value === 'true' || value === 'false' ? value : null;
  }
  if (type === 'number') {
    return isNumericLiteral(value) ? value : null;
  }
  return null;
}

/**
 * JSON-aware substitution for JSON bodies and GraphQL variables. A quoted
 * placeholder `"{{var}}"` whose variable is typed `number` or `boolean` is
 * replaced by the raw unquoted literal (falling back to the quoted string
 * when the value cannot represent the type); other quoted placeholders get a
 * JSON-escaped string. Unquoted placeholders are inserted raw, unchanged.
 */
export function substituteJsonVariables(text: string, scope: VariableScope | null): string {
  if (!scope || !text) return text;

  let result = text;
  for (const variable of scope.variables) {
    if (!variable.enabled || !variable.key) continue;
    const keyPattern = escapeRegExp(variable.key);
    const value = variable.currentValue ?? variable.value ?? '';
    const quoted = new RegExp(`"{{\\s*${keyPattern}\\s*}}"`, 'g');
    const literal = typedJsonLiteral(value, variable.type);
    result = result.replace(quoted, literal ?? JSON.stringify(value));
    const plain = new RegExp(`{{\\s*${keyPattern}\\s*}}`, 'g');
    result = result.replace(plain, value);
  }
  return result;
}

/**
 * Substitute variables in a URL. The plain pass misses the GraphQL GET
 * `variables` query parameter: `URLSearchParams` percent-encodes the braces,
 * so its placeholders only exist in decoded form, where they need the
 * JSON-aware pass (typed values must end up unquoted in the JSON).
 */
function substituteUrlVariables(url: string, scope: VariableScope | null): string {
  const substituted = substituteVariables(url, scope);
  if (!scope || !substituted.includes('=')) return substituted;

  try {
    const parsed = new URL(substituted);
    const variables = parsed.searchParams.get('variables');
    if (variables && variables.includes('{{')) {
      parsed.searchParams.set('variables', substituteJsonVariables(variables, scope));
      return parsed.toString();
    }
  } catch {
    // Not an absolute URL — the plain pass already did everything.
  }
  return substituted;
}

/**
 * Substitute environment variables inside auth credential fields so that
 * users can write `{{API_TOKEN}}` etc. in bearer/basic/api-key/digest fields.
 *
 * `oauth.configId` is left untouched — it's a stable identifier resolved
 * server-side, not a user-entered credential.
 */
export function substituteInAuth(auth: AuthConfig | undefined, scope: VariableScope | null): AuthConfig | undefined {
  if (!auth) return auth;

  const sub = (v: string) => substituteVariables(v, scope);

  switch (auth.type) {
    case 'basic':
      return auth.basic
        ? { ...auth, basic: { username: sub(auth.basic.username), password: sub(auth.basic.password) } }
        : auth;
    case 'bearer':
      return auth.bearer ? { ...auth, bearer: { token: sub(auth.bearer.token) } } : auth;
    case 'api-key':
      return auth.apiKey
        ? { ...auth, apiKey: { ...auth.apiKey, key: sub(auth.apiKey.key), value: sub(auth.apiKey.value) } }
        : auth;
    case 'digest':
      return auth.digest
        ? { ...auth, digest: { username: sub(auth.digest.username), password: sub(auth.digest.password) } }
        : auth;
    case 'oauth':
    case 'none':
    default:
      return auth;
  }
}

/**
 * Substitute variables in all request fields (URL, headers, body, auth).
 * JSON bodies get JSON-aware substitution so typed variables are emitted
 * as unquoted numbers/booleans.
 */
export function substituteInRequest(request: ProxyRequest, scope: VariableScope | null): typeof request {
  if (!scope) return request;

  const jsonMode = request.bodyType === 'json' || (!request.bodyType && !!request.body);
  const bodySub = jsonMode ? substituteJsonVariables : substituteVariables;

  return {
    method: request.method,
    url: substituteUrlVariables(request.url, scope),
    headers: request.headers
      ? Object.fromEntries(Object.entries(request.headers).map(([k, v]) => [k, substituteVariables(v, scope)]))
      : undefined,
    body: request.body ? bodySub(request.body, scope) : undefined,
    bodyType: request.bodyType,
    formDataEntries: request.formDataEntries
      ? request.formDataEntries.map(entry => ({
          ...entry,
          key: substituteVariables(entry.key, scope),
          value: entry.type === 'text' ? substituteVariables(entry.value, scope) : entry.value,
        }))
      : undefined,
    auth: substituteInAuth(request.auth, scope),
  };
}

/**
 * Extract variable names (`{{name}}`) from text.
 */
export function extractVariableNames(text: string): string[] {
  if (!text) return [];
  const pattern = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;
  const matches = text.matchAll(pattern);
  return [...new Set(Array.from(matches, m => m[1]))];
}

/**
 * Check whether a string contains `{{variable}}` placeholders.
 */
export function hasVariables(text: string): boolean {
  if (!text) return false;
  return /\{\{\s*[a-zA-Z0-9_-]+\s*\}\}/.test(text);
}

/**
 * Get all undefined variables used in a request.
 */
export function getUndefinedVariables(
  request: { method: string; url: string; headers?: Record<string, string>; body?: string },
  scope: VariableScope | null
): string[] {
  const used = new Set<string>();

  extractVariableNames(request.url).forEach(v => used.add(v));
  if (request.headers) {
    Object.values(request.headers).forEach(val => {
      extractVariableNames(val).forEach(v => used.add(v));
    });
  }
  if (request.body) {
    extractVariableNames(request.body).forEach(v => used.add(v));
  }

  if (!scope) return Array.from(used);

  const defined = new Set(
    scope.variables
      .filter(v => v.enabled && v.key && (v.currentValue !== undefined || v.value !== undefined))
      .map(v => v.key),
  );
  return Array.from(used).filter(v => !defined.has(v));
}

export function generateEnvironmentId(): string {
  return `env-${Date.now()}`;
}

export function createNewEnvironment(name = 'New Environment'): Environment {
  return { id: generateEnvironmentId(), name, variables: [] };
}

export function duplicateEnvironment(env: Environment, suffix = 'Copy'): Environment {
  return {
    id: generateEnvironmentId(),
    name: `${env.name} ${suffix}`,
    variables: env.variables.map(v => ({ ...v })),
  };
}

export function validateEnvironment(env: Partial<Environment>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!env.name || env.name.trim() === '') errors.push('Environment name is required');
  return { valid: errors.length === 0, errors };
}

export function filterValidVariables(variables: EnvironmentVariable[]): EnvironmentVariable[] {
  return variables.filter(v => v.key.trim() !== '');
}

export function prepareEnvironmentForSave(env: Environment): Environment {
  return { ...env, name: env.name.trim(), variables: filterValidVariables(env.variables) };
}

export function createEmptyVariable(): EnvironmentVariable {
  return { key: '', value: '', enabled: true, isSecret: false, type: 'string' };
}
