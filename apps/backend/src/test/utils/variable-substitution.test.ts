import { describe, it, expect } from 'vitest';
import {
  inferType,
  isNumericLiteral,
  substituteInAuth,
  substituteInRequest,
  substituteJsonVariables,
  substituteVariables,
} from '../../utils/variable-substitution';
import type { Environment } from '../../models/environment';

const env: Environment = {
  id: 'env-1',
  name: 'Test',
  variables: [
    { key: 'USER', value: 'alice', enabled: true },
    { key: 'PASS', value: 'p4ss', enabled: true },
    { key: 'TOKEN', value: 'sekret', enabled: true },
    { key: 'KEY_NAME', value: 'X-Api-Key', enabled: true },
    { key: 'KEY_VAL', value: 'abc123', enabled: true },
  ],
};

describe('substituteVariables (backend)', () => {
  it('returns original text when environment is null', () => {
    expect(substituteVariables('{{TOKEN}}', null)).toBe('{{TOKEN}}');
  });

  it('substitutes a single variable', () => {
    expect(substituteVariables('{{TOKEN}}', env)).toBe('sekret');
  });
});

const typedEnv: Environment = {
  id: 'env-2',
  name: 'Typed',
  variables: [
    { key: 'userId', value: '42', enabled: true, type: 'number' },
    { key: 'active', value: 'true', enabled: true, type: 'boolean' },
    { key: 'inactive', value: 'false', enabled: true, type: 'boolean' },
    { key: 'name', value: 'alice', enabled: true, type: 'string' },
    { key: 'notANumber', value: 'abc', enabled: true, type: 'number' },
    { key: 'quoted', value: 'say "hi"', enabled: true },
    { key: 'zip', value: '02134', enabled: true, type: 'number' },
    { key: 'disabled', value: '99', enabled: false, type: 'number' },
  ],
};

describe('substituteJsonVariables (backend)', () => {
  it('emits number-typed values unquoted inside a quoted placeholder', () => {
    const body = '{"userId": "{{userId}}"}';
    expect(substituteJsonVariables(body, typedEnv)).toBe('{"userId": 42}');
  });

  it('emits boolean-typed values unquoted', () => {
    expect(substituteJsonVariables('{"active": "{{active}}"}', typedEnv)).toBe('{"active": true}');
    expect(substituteJsonVariables('{"active": "{{inactive}}"}', typedEnv)).toBe('{"active": false}');
  });

  it('keeps string-typed variables quoted', () => {
    expect(substituteJsonVariables('{"name": "{{name}}"}', typedEnv)).toBe('{"name": "alice"}');
  });

  it('falls back to a quoted string when a number-typed value is not numeric', () => {
    expect(substituteJsonVariables('{"v": "{{notANumber}}"}', typedEnv)).toBe('{"v": "abc"}');
  });

  it('falls back to a quoted string for leading-zero numbers (invalid JSON literals)', () => {
    expect(substituteJsonVariables('{"zip": "{{zip}}"}', typedEnv)).toBe('{"zip": "02134"}');
  });

  it('JSON-escapes string values so quotes cannot corrupt the body', () => {
    expect(substituteJsonVariables('{"msg": "{{quoted}}"}', typedEnv)).toBe('{"msg": "say \\"hi\\""}');
  });

  it('inserts unquoted placeholders raw (Postman-style)', () => {
    expect(substituteJsonVariables('{"userId": {{userId}}}', typedEnv)).toBe('{"userId": 42}');
    expect(substituteJsonVariables('{"name": {{name}}}', typedEnv)).toBe('{"name": alice}');
  });

  it('uses currentValue over value', () => {
    const env: Environment = {
      ...typedEnv,
      variables: [{ key: 'userId', value: '1', currentValue: '7', enabled: true, type: 'number' }],
    };
    expect(substituteJsonVariables('{"userId": "{{userId}}"}', env)).toBe('{"userId": 7}');
  });

  it('skips disabled variables and unresolved placeholders stay raw', () => {
    expect(substituteJsonVariables('{"d": "{{disabled}}"}', typedEnv)).toBe('{"d": "{{disabled}}"}');
  });

  it('returns the text unchanged when environment is null', () => {
    expect(substituteJsonVariables('{"a": "{{b}}"}', null)).toBe('{"a": "{{b}}"}');
  });

  it('handles placeholders embedded in larger strings as plain substitution', () => {
    expect(substituteJsonVariables('{"id": "user-{{userId}}"}', typedEnv)).toBe('{"id": "user-42"}');
  });
});

describe('isNumericLiteral (backend)', () => {
  it('accepts valid JSON number literals', () => {
    expect(isNumericLiteral('42')).toBe(true);
    expect(isNumericLiteral('-3.14')).toBe(true);
    expect(isNumericLiteral('1e10')).toBe(true);
    expect(isNumericLiteral(' 2 ')).toBe(true);
  });

  it('rejects values JSON.parse would reject', () => {
    expect(isNumericLiteral('')).toBe(false);
    expect(isNumericLiteral('NaN')).toBe(false);
    expect(isNumericLiteral('Infinity')).toBe(false);
    expect(isNumericLiteral('0x10')).toBe(false);
    expect(isNumericLiteral('02134')).toBe(false);
    expect(isNumericLiteral('1_000')).toBe(false);
    expect(isNumericLiteral('abc')).toBe(false);
  });
});

describe('inferType (backend)', () => {
  it('infers from runtime values', () => {
    expect(inferType(42)).toBe('number');
    expect(inferType(true)).toBe('boolean');
    expect(inferType(false)).toBe('boolean');
    expect(inferType('hello')).toBe('string');
    expect(inferType(null)).toBe('string');
  });

  it('infers from literal strings (CLI vars, .env, stringly script sets)', () => {
    expect(inferType('42')).toBe('number');
    expect(inferType('-1.5e3')).toBe('number');
    expect(inferType('true')).toBe('boolean');
    expect(inferType('false')).toBe('boolean');
    expect(inferType('02134')).toBe('string');
    expect(inferType('True')).toBe('string');
  });
});

describe('substituteInRequest JSON bodies (backend)', () => {
  it('uses JSON-aware substitution for json bodyType', () => {
    const result = substituteInRequest(
      { url: 'http://x.local', body: '{"userId": "{{userId}}"}', bodyType: 'json' },
      typedEnv,
    );
    expect(result.body).toBe('{"userId": 42}');
  });

  it('defaults to JSON-aware substitution when a body is present without bodyType', () => {
    const result = substituteInRequest({ url: 'http://x.local', body: '{"userId": "{{userId}}"}' }, typedEnv);
    expect(result.body).toBe('{"userId": 42}');
  });

  it('uses plain substitution for form-data bodies', () => {
    const result = substituteInRequest(
      { url: 'http://x.local', body: '{"userId": "{{userId}}"}', bodyType: 'form-data' },
      typedEnv,
    );
    expect(result.body).toBe('{"userId": "42"}');
  });

  it('keeps URL and header substitution plain (always strings)', () => {
    const result = substituteInRequest(
      {
        url: 'http://x.local/{{userId}}',
        headers: { Authorization: 'Bearer {{quoted}}' },
        body: '{"userId": "{{userId}}"}',
        bodyType: 'json',
      },
      typedEnv,
    );
    expect(result.url).toBe('http://x.local/42');
    expect(result.headers?.Authorization).toBe('Bearer say "hi"');
    expect(result.body).toBe('{"userId": 42}');
  });

  it('substitutes the GraphQL GET variables query parameter (percent-encoded braces)', () => {
    const variablesJson = encodeURIComponent('{"userId":"{{userId}}","active":"{{active}}"}');
    const url = `http://x.local/graphql?query={user}&variables=${variablesJson}`;
    const result = substituteInRequest({ url, bodyType: 'json' }, typedEnv);
    const parsed = new URL(result.url!);
    expect(JSON.parse(parsed.searchParams.get('variables')!)).toEqual({ userId: 42, active: true });
  });

  it('substitutes GraphQL GET variables while leaving plain strings quoted', () => {
    const variablesJson = encodeURIComponent('{"name":"{{name}}"}');
    const url = `http://x.local/graphql?query={user}&variables=${variablesJson}`;
    const result = substituteInRequest({ url }, typedEnv);
    const parsed = new URL(result.url!);
    expect(JSON.parse(parsed.searchParams.get('variables')!)).toEqual({ name: 'alice' });
  });

  it('returns other URLs unchanged by the GraphQL variables pass', () => {
    const result = substituteInRequest({ url: 'http://x.local/{{name}}?a=1' }, typedEnv);
    expect(result.url).toBe('http://x.local/alice?a=1');
  });
});

describe('substituteInAuth (backend)', () => {
  it('substitutes basic auth fields', () => {
    const result = substituteInAuth(
      { type: 'basic', basic: { username: '{{USER}}', password: '{{PASS}}' } },
      env,
    );
    expect(result?.basic).toEqual({ username: 'alice', password: 'p4ss' });
  });

  it('substitutes the bearer token (the headline persistence bug fix)', () => {
    const result = substituteInAuth(
      { type: 'bearer', bearer: { token: '{{TOKEN}}' } },
      env,
    );
    expect(result?.bearer?.token).toBe('sekret');
  });

  it('substitutes api-key fields', () => {
    const result = substituteInAuth(
      { type: 'api-key', apiKey: { key: '{{KEY_NAME}}', value: '{{KEY_VAL}}', addTo: 'header' } },
      env,
    );
    expect(result?.apiKey).toEqual({ key: 'X-Api-Key', value: 'abc123', addTo: 'header' });
  });

  it('substitutes digest fields', () => {
    const result = substituteInAuth(
      { type: 'digest', digest: { username: '{{USER}}', password: '{{PASS}}' } },
      env,
    );
    expect(result?.digest).toEqual({ username: 'alice', password: 'p4ss' });
  });

  it('leaves oauth.configId untouched (resolved server-side)', () => {
    const result = substituteInAuth(
      { type: 'oauth', oauth: { configId: '{{TOKEN}}' } },
      env,
    );
    expect(result?.oauth?.configId).toBe('{{TOKEN}}');
  });

  it('returns auth unchanged for type: none', () => {
    expect(substituteInAuth({ type: 'none' }, env)).toEqual({ type: 'none' });
  });

  it('returns undefined for undefined input', () => {
    expect(substituteInAuth(undefined, env)).toBeUndefined();
  });
});
