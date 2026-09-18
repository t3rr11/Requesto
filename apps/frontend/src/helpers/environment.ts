import type { Environment, EnvironmentVariable, EnvironmentVariableType } from '../store/environments/types';
import type { AuthConfig, ProxyRequest } from '../store/request/types';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace `{{variableName}}` placeholders with values from the active environment.
 */
export function substituteVariables(text: string, environment: Environment | null): string {
  if (!environment || !text) return text;

  let result = text;
  for (const variable of environment.variables) {
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
export function substituteJsonVariables(text: string, environment: Environment | null): string {
  if (!environment || !text) return text;

  let result = text;
  for (const variable of environment.variables) {
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
function substituteUrlVariables(url: string, environment: Environment | null): string {
  const substituted = substituteVariables(url, environment);
  if (!environment || !substituted.includes('=')) return substituted;

  try {
    const parsed = new URL(substituted);
    const variables = parsed.searchParams.get('variables');
    if (variables && variables.includes('{{')) {
      parsed.searchParams.set('variables', substituteJsonVariables(variables, environment));
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
export function substituteInAuth(auth: AuthConfig | undefined, environment: Environment | null): AuthConfig | undefined {
  if (!auth) return auth;

  const sub = (v: string) => substituteVariables(v, environment);

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
export function substituteInRequest(request: ProxyRequest, environment: Environment | null): typeof request {
  if (!environment) return request;

  const jsonMode = request.bodyType === 'json' || (!request.bodyType && !!request.body);
  const bodySub = jsonMode ? substituteJsonVariables : substituteVariables;

  return {
    method: request.method,
    url: substituteUrlVariables(request.url, environment),
    headers: request.headers
      ? Object.fromEntries(Object.entries(request.headers).map(([k, v]) => [k, substituteVariables(v, environment)]))
      : undefined,
    body: request.body ? bodySub(request.body, environment) : undefined,
    bodyType: request.bodyType,
    formDataEntries: request.formDataEntries
      ? request.formDataEntries.map(entry => ({
          ...entry,
          key: substituteVariables(entry.key, environment),
          value: entry.type === 'text' ? substituteVariables(entry.value, environment) : entry.value,
        }))
      : undefined,
    auth: substituteInAuth(request.auth, environment),
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
  environment: Environment | null
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

  if (!environment) return Array.from(used);

  const defined = new Set(
    environment.variables
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
