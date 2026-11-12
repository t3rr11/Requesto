import { describe, it, expect } from 'vitest';
import {
  inferType,
  isNumericLiteral,
  substituteInAuth,
  substituteInRequest,
  substituteJsonVariables,
  substituteVariables,
  effectiveVariables,
  folderChainFor,
} from '../../utils/variable-substitution';
import type { Environment } from '../../models/environment';
import type { Collection, Folder } from '../../models/collection';

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

// GOTCHA: Fixtures mirrored in apps/frontend/src/test/helpers/environment.test.ts; keep in sync.
const mergeCollection: Collection = {
  id: 'col-1',
  name: 'Collection',
  folders: [],
  requests: [],
  variables: [
    { key: 'BASE_URL', value: 'https://collection.example', enabled: true },
    { key: 'ONLY_IN_COLLECTION', value: 'collection', enabled: true },
    { key: 'MASKED_BY_FOLDER', value: 'collection', enabled: true },
    { key: 'MASKED_BY_ENV', value: 'collection', enabled: true },
    { key: 'ENV_DISABLED_FALLBACK', value: 'collection', enabled: true },
    { key: 'TYPED', value: '42', enabled: true, type: 'number' },
    { key: 'LAST_WINS', value: 'first', enabled: true },
    { key: 'LAST_WINS', value: 'second', enabled: true },
  ],
};

const outerFolder: Folder = {
  id: 'f-1',
  name: 'Outer',
  collectionId: 'col-1',
  variables: [
    { key: 'MASKED_BY_FOLDER', value: 'outer', enabled: true },
    { key: 'FOLDER_KEY', value: 'outer', enabled: true },
    { key: 'INNER_OVERRIDES', value: 'outer', enabled: true },
  ],
};

const innerFolder: Folder = {
  id: 'f-2',
  name: 'Inner',
  collectionId: 'col-1',
  variables: [
    { key: 'FOLDER_KEY', value: 'inner', enabled: true },
    { key: 'INNER_OVERRIDES', value: 'inner', enabled: true },
  ],
};

const mergeEnv: Environment = {
  id: 'env-9',
  name: 'Merge',
  variables: [
    { key: 'BASE_URL', value: 'https://env.example', enabled: true },
    { key: 'MASKED_BY_ENV', value: 'env', enabled: true },
    { key: 'ENV_DISABLED_FALLBACK', value: 'env', enabled: false },
    { key: 'CURRENT', value: 'initial', currentValue: 'current', enabled: true },
  ],
};

function merged(
  environment: Environment | null,
  collection?: Collection | null,
  folderChain?: Folder[],
) {
  return effectiveVariables(environment, collection, folderChain);
}

describe('effectiveVariables (backend)', () => {
  it('environment wins over folder and collection', () => {
    const scope = merged(mergeEnv, mergeCollection, [outerFolder, innerFolder]);
    const vars = Object.fromEntries(scope.variables.map((v) => [v.key, v.value]));
    expect(vars.BASE_URL).toBe('https://env.example');
    expect(vars.MASKED_BY_ENV).toBe('env');
  });

  it('innermost folder wins over outer folder', () => {
    const scope = merged(mergeEnv, mergeCollection, [outerFolder, innerFolder]);
    const vars = Object.fromEntries(scope.variables.map((v) => [v.key, v.value]));
    expect(vars.FOLDER_KEY).toBe('inner');
    expect(vars.INNER_OVERRIDES).toBe('inner');
  });

  it('folder wins over collection', () => {
    const scope = merged(mergeEnv, mergeCollection, [outerFolder, innerFolder]);
    const vars = Object.fromEntries(scope.variables.map((v) => [v.key, v.value]));
    expect(vars.MASKED_BY_FOLDER).toBe('outer');
  });

  it('disabled variable in a higher scope falls back to lower scopes', () => {
    const scope = merged(mergeEnv, mergeCollection, [outerFolder, innerFolder]);
    const vars = Object.fromEntries(scope.variables.map((v) => [v.key, v.value]));
    expect(vars.ENV_DISABLED_FALLBACK).toBe('collection');
  });

  it('resolves collection and folder variables with no environment', () => {
    const scope = merged(null, mergeCollection, [outerFolder, innerFolder]);
    const vars = Object.fromEntries(scope.variables.map((v) => [v.key, v.value]));
    expect(vars.BASE_URL).toBe('https://collection.example');
    expect(vars.FOLDER_KEY).toBe('inner');
    expect(substituteVariables('{{BASE_URL}}/{{FOLDER_KEY}}', scope)).toBe(
      'https://collection.example/inner',
    );
  });

  it('currentValue wins over value', () => {
    const scope = merged(mergeEnv, mergeCollection, [outerFolder, innerFolder]);
    const entry = scope.variables.find((v) => v.key === 'CURRENT');
    expect(entry?.currentValue).toBe('current');
    expect(substituteVariables('{{CURRENT}}', scope)).toBe('current');
  });

  it('last duplicate key within a scope wins', () => {
    const scope = merged(mergeEnv, mergeCollection, [outerFolder, innerFolder]);
    const vars = Object.fromEntries(scope.variables.map((v) => [v.key, v.value]));
    expect(vars.LAST_WINS).toBe('second');
  });

  it('keeps variable types through the merge', () => {
    const scope = merged(mergeEnv, mergeCollection, [outerFolder, innerFolder]);
    expect(substituteJsonVariables('{"id": "{{TYPED}}"}', scope)).toBe('{"id": 42}');
  });
});

//GOTCHA: Keep the folderChainFor fixtures in sync with apps/frontend/src/test/helpers/environment.test.ts.
describe('folderChainFor (backend)', () => {
  const chainCollection: Collection = {
    id: 'col-1',
    name: 'Chain',
    folders: [
      { id: 'f-1', name: 'Outer', collectionId: 'col-1' },
      { id: 'f-2', name: 'Inner', parentId: 'f-1', collectionId: 'col-1' },
      { id: 'f-3', name: 'Other', collectionId: 'col-1' },
    ],
    requests: [],
  };

  it('walks parentId upward, outermost to innermost', () => {
    expect(folderChainFor(chainCollection, 'f-2').map((f) => f.id)).toEqual(['f-1', 'f-2']);
  });

  it('returns a single entry for a root-level folder', () => {
    expect(folderChainFor(chainCollection, 'f-3').map((f) => f.id)).toEqual(['f-3']);
  });

  it('returns empty for root-level requests, unknown folders, and missing collections', () => {
    expect(folderChainFor(chainCollection)).toEqual([]);
    expect(folderChainFor(chainCollection, 'missing')).toEqual([]);
    expect(folderChainFor(null, 'f-1')).toEqual([]);
  });
});
