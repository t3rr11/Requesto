import { Environment } from '../models/environment';
import { AuthConfig, FormDataEntry } from '../models/proxy';

/**
 * Replace all `{{variableName}}` placeholders in a string with values
 * from the active environment. Disabled variables are skipped.
 */
export function substituteVariables(
  text: string,
  environment: Environment | null,
): string {
  if (!environment) return text;

  let result = text;
  for (const variable of environment.variables) {
    if (variable.enabled) {
      const pattern = new RegExp(`{{\\s*${escapeRegex(variable.key)}\\s*}}`, 'g');
      // currentValue (set by pre-request scripts) takes precedence over value (initial)
      result = result.replace(pattern, variable.currentValue ?? variable.value);
    }
  }
  return result;
}

/** Escape special regex characters in a variable key. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface RequestData {
  url: string;
  headers?: Record<string, string>;
  body?: string;
  formDataEntries?: FormDataEntry[];
}

/**
 * Apply variable substitution to all substitutable fields in a request:
 * URL, header values, body, and form-data text values.
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
  return {
    url: substituteVariables(request.url, environment),
    headers: request.headers
      ? Object.fromEntries(
          Object.entries(request.headers).map(([key, value]) => [
            key,
            substituteVariables(value, environment),
          ]),
        )
      : undefined,
    body: request.body ? substituteVariables(request.body, environment) : undefined,
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
