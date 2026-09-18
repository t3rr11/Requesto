import { Environment, EnvironmentVariableType } from '../models/environment';
import { AuthConfig, FormDataEntry } from '../models/proxy';

/**
 * Replace all `{{variableName}}` placeholders in a string with values
 * from the active environment. Disabled variables are skipped.
 *
 * Variable values may themselves reference other variables (e.g. a
 * `baseUrl` variable set to `{{requestoServerUrl}}`); references are
 * resolved recursively and cycles are left unresolved rather than
 * looping forever.
 */
export function substituteVariables(
  text: string,
  environment: Environment | null,
): string {
  if (!environment) return text;

  const values = getResolvedValues(environment);
  let result = text;
  for (const [key, entry] of values) {
    const pattern = new RegExp(`{{\\s*${escapeRegex(key)}\\s*}}`, 'g');
    result = result.replace(pattern, entry.value);
  }
  return result;
}

/**
 * JSON-aware substitution for JSON bodies and GraphQL variables. A quoted
 * placeholder `"{{var}}"` whose variable is typed `number` or `boolean` is
 * replaced by the raw unquoted literal (falling back to the quoted string
 * when the value cannot represent the type); other quoted placeholders get a
 * JSON-escaped string. Unquoted placeholders are inserted raw, unchanged.
 */
export function substituteJsonVariables(
  text: string,
  environment: Environment | null,
): string {
  if (!environment) return text;

  const values = getResolvedValues(environment);
  let result = text;
  for (const [key, entry] of values) {
    const keyPattern = escapeRegex(key);
    const quoted = new RegExp(`"{{\\s*${keyPattern}\\s*}}"`, 'g');
    const literal = typedJsonLiteral(entry.value, entry.type);
    result = result.replace(quoted, literal ?? JSON.stringify(entry.value));
    const plain = new RegExp(`{{\\s*${keyPattern}\\s*}}`, 'g');
    result = result.replace(plain, entry.value);
  }
  return result;
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
 * Environment variables as a key → { value, type } map with fully-resolved
 * values. Only enabled variables are included; `currentValue` (set by
 * pre-request scripts) takes precedence over `value` (initial).
 */
function getResolvedValues(
  environment: Environment,
): Map<string, { value: string; type: EnvironmentVariableType | undefined }> {
  const raw = new Map<string, { value: string; type: EnvironmentVariableType | undefined }>();
  for (const variable of environment.variables) {
    if (variable.enabled) {
      raw.set(variable.key, {
        value: variable.currentValue ?? variable.value,
        type: variable.type,
      });
    }
  }

  const resolved = new Map<string, { value: string; type: EnvironmentVariableType | undefined }>();
  const visiting = new Set<string>();

  const resolve = (key: string): { value: string; type: EnvironmentVariableType | undefined } => {
    const memo = resolved.get(key);
    if (memo !== undefined) return memo;
    // Cycle: return the raw value so resolution terminates.
    if (visiting.has(key)) {
      const entry = raw.get(key);
      return { value: entry?.value ?? '', type: entry?.type };
    }
    visiting.add(key);
    const entry = raw.get(key) ?? { value: '', type: undefined as EnvironmentVariableType | undefined };
    const value = entry.value.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, name: string) => {
      const referenced = name.trim();
      return raw.has(referenced) ? resolve(referenced).value : match;
    });
    visiting.delete(key);
    const result = { value, type: entry.type };
    resolved.set(key, result);
    return result;
  };

  for (const key of raw.keys()) resolve(key);
  return resolved;
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

/** Escape special regex characters in a variable key. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface RequestData {
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: string;
  formDataEntries?: FormDataEntry[];
}

/**
 * Apply variable substitution to all substitutable fields in a request:
 * URL, header values, body, and form-data text values.
 *
 * JSON bodies (`bodyType: 'json'`, or a body present with no explicit type —
 * the proxy's default) get JSON-aware substitution; the URL gets JSON-aware
 * handling for the GraphQL `variables` query parameter (see
 * `substituteUrlVariables`).
 */
export function substituteInRequest(
  request: RequestData,
  environment: Environment | null,
): {
  url: string;
  headers?: Record<string, string>;
  body?: string;
  formDataEntries?: FormDataEntry[];
} {
  const jsonMode = request.bodyType === 'json' || (!request.bodyType && !!request.body);
  const bodySub = jsonMode ? substituteJsonVariables : substituteVariables;
  return {
    url: substituteUrlVariables(request.url, environment),
    headers: request.headers
      ? Object.fromEntries(
          Object.entries(request.headers).map(([key, value]) => [
            key,
            substituteVariables(value, environment),
          ]),
        )
      : undefined,
    body: request.body ? bodySub(request.body, environment) : undefined,
    formDataEntries: request.formDataEntries
      ? request.formDataEntries.map((entry) => ({
          ...entry,
          key: substituteVariables(entry.key, environment),
          value:
            entry.type === 'text'
              ? substituteVariables(entry.value, environment)
              : entry.value,
        }))
      : undefined,
  };
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
 * `{{API_TOKEN}}`-style placeholders work in bearer/basic/api-key/digest
 * fields the same way they do in URL/headers/body.
 *
 * `oauth.configId` is left untouched — it's a stable identifier resolved
 * server-side, not a user-entered credential.
 */
export function substituteInAuth(
  auth: AuthConfig | undefined,
  environment: Environment | null,
): AuthConfig | undefined {
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
