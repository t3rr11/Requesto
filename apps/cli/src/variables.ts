import type { AuthConfig, EnvironmentVariable } from './types';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replace {{variableName}} placeholders. currentValue takes precedence over value. */
export function substituteVariables(text: string, variables: EnvironmentVariable[]): string {
  let result = text;
  for (const v of variables) {
    if (v.enabled) {
      const pattern = new RegExp(`{{\\s*${escapeRegex(v.key)}\\s*}}`, 'g');
      result = result.replace(pattern, v.currentValue ?? v.value);
    }
  }
  return result;
}

export function substituteInAuth(
  auth: AuthConfig | undefined,
  variables: EnvironmentVariable[],
): AuthConfig | undefined {
  if (!auth || auth.type === 'none') return auth;
  const sub = (s: string) => substituteVariables(s, variables);
  switch (auth.type) {
    case 'basic':
      if (auth.basic) {
        return { ...auth, basic: { username: sub(auth.basic.username), password: sub(auth.basic.password) } };
      }
      break;
    case 'bearer':
      if (auth.bearer) {
        return { ...auth, bearer: { token: sub(auth.bearer.token) } };
      }
      break;
    case 'api-key':
      if (auth.apiKey) {
        return { ...auth, apiKey: { ...auth.apiKey, key: sub(auth.apiKey.key), value: sub(auth.apiKey.value) } };
      }
      break;
    case 'digest':
      if (auth.digest) {
        return { ...auth, digest: { username: sub(auth.digest.username), password: sub(auth.digest.password) } };
      }
      break;
    case 'oauth':
      return auth; // configId is a stable identifier, not user-entered text
  }
  return auth;
}
