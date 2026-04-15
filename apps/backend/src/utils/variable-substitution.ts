import { Environment } from '../models/environment';
import { FormDataEntry } from '../models/proxy';

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
      result = result.replace(pattern, variable.value);
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
