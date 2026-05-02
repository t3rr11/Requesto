import type { Environment, EnvironmentVariable } from '../store/environments/types';
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
 */
export function substituteInRequest(request: ProxyRequest, environment: Environment | null): typeof request {
  if (!environment) return request;

  return {
    method: request.method,
    url: substituteVariables(request.url, environment),
    headers: request.headers
      ? Object.fromEntries(Object.entries(request.headers).map(([k, v]) => [k, substituteVariables(v, environment)]))
      : undefined,
    body: request.body ? substituteVariables(request.body, environment) : undefined,
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
  return { key: '', value: '', enabled: true, isSecret: false };
}
