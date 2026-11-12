import { describe, it, expect } from 'vitest';
import {
  substituteVariables,
  substituteJsonVariables,
  substituteInAuth,
  substituteInRequest,
  extractVariableNames,
  hasVariables,
  getUndefinedVariables,
  generateEnvironmentId,
  createNewEnvironment,
  validateEnvironment,
  filterValidVariables,
  createEmptyVariable,
  isNumericLiteral,
  inferType,
  effectiveVariables,
  effectiveVariablesWithOverrides,
  mergeScriptOverrides,
  scriptVariableRecords,
  type ScriptScopeOverrides,
} from '../../helpers/environment';
import type { Environment } from '../../store/environments/types';
import type { Collection } from '../../store/collections/types';

const makeEnv = (vars: { key: string; value: string; enabled: boolean }[]): Environment => ({
  id: 'env-1',
  name: 'Test',
  variables: vars,
});

describe('substituteVariables', () => {
  it('replaces {{var}} with values', () => {
    const env = makeEnv([{ key: 'host', value: 'example.com', enabled: true }]);
    expect(substituteVariables('https://{{host}}/api', env)).toBe('https://example.com/api');
  });

  it('skips disabled variables', () => {
    const env = makeEnv([{ key: 'host', value: 'example.com', enabled: false }]);
    expect(substituteVariables('https://{{host}}/api', env)).toBe('https://{{host}}/api');
  });

  it('handles multiple variables', () => {
    const env = makeEnv([
      { key: 'host', value: 'example.com', enabled: true },
      { key: 'version', value: 'v2', enabled: true },
    ]);
    expect(substituteVariables('https://{{host}}/{{version}}', env)).toBe('https://example.com/v2');
  });

  it('returns original if environment is null', () => {
    expect(substituteVariables('https://{{host}}', null)).toBe('https://{{host}}');
  });
});

const makeTypedEnv = (vars: { key: string; value: string; enabled?: boolean; type?: 'string' | 'number' | 'boolean'; currentValue?: string }[]): Environment => ({
  id: 'env-typed',
  name: 'Typed',
  variables: vars.map(v => ({ enabled: true, ...v })),
});

describe('substituteJsonVariables', () => {
  it('emits number-typed values unquoted inside a quoted placeholder', () => {
    const env = makeTypedEnv([{ key: 'userId', value: '42', type: 'number' }]);
    expect(substituteJsonVariables('{"userId": "{{userId}}"}', env)).toBe('{"userId": 42}');
  });

  it('emits boolean-typed values unquoted', () => {
    const env = makeTypedEnv([
      { key: 'active', value: 'true', type: 'boolean' },
      { key: 'inactive', value: 'false', type: 'boolean' },
    ]);
    expect(substituteJsonVariables('{"active": "{{active}}"}', env)).toBe('{"active": true}');
    expect(substituteJsonVariables('{"inactive": "{{inactive}}"}', env)).toBe('{"inactive": false}');
  });

  it('keeps string-typed variables quoted', () => {
    const env = makeTypedEnv([{ key: 'name', value: 'alice', type: 'string' }]);
    expect(substituteJsonVariables('{"name": "{{name}}"}', env)).toBe('{"name": "alice"}');
  });

  it('falls back to a quoted string when a number-typed value is not numeric', () => {
    const env = makeTypedEnv([{ key: 'v', value: 'abc', type: 'number' }]);
    expect(substituteJsonVariables('{"v": "{{v}}"}', env)).toBe('{"v": "abc"}');
  });

  it('falls back to a quoted string for leading-zero numbers (invalid JSON literals)', () => {
    const env = makeTypedEnv([{ key: 'zip', value: '02134', type: 'number' }]);
    expect(substituteJsonVariables('{"zip": "{{zip}}"}', env)).toBe('{"zip": "02134"}');
  });

  it('JSON-escapes string values so quotes cannot corrupt the body', () => {
    const env = makeTypedEnv([{ key: 'msg', value: 'say "hi"', type: 'string' }]);
    expect(substituteJsonVariables('{"msg": "{{msg}}"}', env)).toBe('{"msg": "say \\"hi\\""}');
  });

  it('inserts unquoted placeholders raw (Postman-style)', () => {
    const env = makeTypedEnv([
      { key: 'userId', value: '42', type: 'number' },
      { key: 'name', value: 'alice', type: 'string' },
    ]);
    expect(substituteJsonVariables('{"userId": {{userId}}}', env)).toBe('{"userId": 42}');
    expect(substituteJsonVariables('{"name": {{name}}}', env)).toBe('{"name": alice}');
  });

  it('uses currentValue over value', () => {
    const env = makeTypedEnv([{ key: 'userId', value: '1', currentValue: '7', type: 'number' }]);
    expect(substituteJsonVariables('{"userId": "{{userId}}"}', env)).toBe('{"userId": 7}');
  });

  it('skips disabled variables', () => {
    const env = makeTypedEnv([{ key: 'd', value: '99', type: 'number', enabled: false }]);
    expect(substituteJsonVariables('{"d": "{{d}}"}', env)).toBe('{"d": "{{d}}"}');
  });

  it('returns the text unchanged when environment is null', () => {
    expect(substituteJsonVariables('{"a": "{{b}}"}', null)).toBe('{"a": "{{b}}"}');
  });

  it('treats variables without a declared type as strings', () => {
    const env = makeTypedEnv([{ key: 'n', value: '42' }]);
    expect(substituteJsonVariables('{"n": "{{n}}"}', env)).toBe('{"n": "42"}');
  });
});

describe('isNumericLiteral', () => {
  it('accepts valid JSON number literals', () => {
    expect(isNumericLiteral('42')).toBe(true);
    expect(isNumericLiteral('-3.14')).toBe(true);
    expect(isNumericLiteral('1e10')).toBe(true);
  });

  it('rejects values JSON.parse would reject', () => {
    expect(isNumericLiteral('')).toBe(false);
    expect(isNumericLiteral('NaN')).toBe(false);
    expect(isNumericLiteral('Infinity')).toBe(false);
    expect(isNumericLiteral('0x10')).toBe(false);
    expect(isNumericLiteral('02134')).toBe(false);
  });
});

describe('inferType', () => {
  it('infers from runtime values', () => {
    expect(inferType(42)).toBe('number');
    expect(inferType(true)).toBe('boolean');
    expect(inferType('hello')).toBe('string');
  });

  it('infers from literal strings', () => {
    expect(inferType('42')).toBe('number');
    expect(inferType('true')).toBe('boolean');
    expect(inferType('02134')).toBe('string');
    expect(inferType('True')).toBe('string');
  });
});

describe('extractVariableNames', () => {
  it('extracts all unique variable names', () => {
    expect(extractVariableNames('{{a}} and {{b}} and {{a}}')).toEqual(['a', 'b']);
  });

  it('returns empty array when no variables', () => {
    expect(extractVariableNames('no vars here')).toEqual([]);
  });
});

describe('hasVariables', () => {
  it('returns true when text has variables', () => {
    expect(hasVariables('{{host}}')).toBe(true);
  });

  it('returns false when no variables', () => {
    expect(hasVariables('plain text')).toBe(false);
  });
});

describe('getUndefinedVariables', () => {
  it('finds variables not in the environment', () => {
    const env = makeEnv([{ key: 'host', value: 'x', enabled: true }]);
    const result = getUndefinedVariables({ method: 'GET', url: 'https://{{host}}:{{port}}' }, env);
    expect(result).toEqual(['port']);
  });

  it('returns empty when all defined', () => {
    const env = makeEnv([{ key: 'host', value: 'x', enabled: true }]);
    const result = getUndefinedVariables({ method: 'GET', url: 'https://{{host}}' }, env);
    expect(result).toEqual([]);
  });

  it('returns all used variables when environment is null', () => {
    const result = getUndefinedVariables({ method: 'GET', url: '{{host}}/{{path}}' }, null);
    expect(result).toContain('host');
    expect(result).toContain('path');
  });
});

describe('generateEnvironmentId', () => {
  it('returns a string starting with env-', () => {
    const id = generateEnvironmentId();
    expect(id).toBeTruthy();
    expect(id.startsWith('env-')).toBe(true);
  });
});

describe('createNewEnvironment', () => {
  it('creates with default name', () => {
    const env = createNewEnvironment();
    expect(env.name).toBe('New Environment');
    expect(env.variables).toEqual([]);
    expect(env.id).toBeTruthy();
  });

  it('creates with specified name', () => {
    const env = createNewEnvironment('Production');
    expect(env.name).toBe('Production');
  });
});

describe('validateEnvironment', () => {
  it('returns errors for missing name', () => {
    const env = createNewEnvironment('');
    const result = validateEnvironment(env);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns valid for an environment with a name', () => {
    const env = createNewEnvironment('Test');
    const result = validateEnvironment(env);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('filterValidVariables', () => {
  it('removes variables with empty keys', () => {
    const vars = [
      { key: 'host', value: 'x', enabled: true },
      { key: '', value: 'y', enabled: true },
    ];
    expect(filterValidVariables(vars)).toEqual([{ key: 'host', value: 'x', enabled: true }]);
  });
});

describe('createEmptyVariable', () => {
  it('creates a variable with empty key and value', () => {
    const v = createEmptyVariable();
    expect(v.key).toBe('');
    expect(v.value).toBe('');
    expect(v.enabled).toBe(true);
    expect(v.type).toBe('string');
  });
});

describe('substituteInRequest', () => {
  it('substitutes variables in formDataEntries keys and text values', () => {
    const env = makeEnv([
      { key: 'field', value: 'username', enabled: true },
      { key: 'val', value: 'john', enabled: true },
    ]);
    const result = substituteInRequest(
      {
        method: 'POST',
        url: 'https://example.com',
        formDataEntries: [
          { id: '1', key: '{{field}}', value: '{{val}}', type: 'text' as const, enabled: true },
        ],
      },
      env,
    );
    expect(result.formDataEntries![0].key).toBe('username');
    expect(result.formDataEntries![0].value).toBe('john');
  });

  it('does not substitute variables in file-type entry values', () => {
    const env = makeEnv([{ key: 'name', value: 'replaced', enabled: true }]);
    const result = substituteInRequest(
      {
        method: 'POST',
        url: 'https://example.com',
        formDataEntries: [
          {
            id: '1', key: 'avatar', value: '', type: 'file' as const,
            fileName: '{{name}}.png', fileContent: 'data:image/png;base64,abc',
            enabled: true,
          },
        ],
      },
      env,
    );
    // File value (data URL) should NOT be substituted
    expect(result.formDataEntries![0].value).toBe('');
  });

  it('passes through bodyType unchanged', () => {
    const result = substituteInRequest(
      {
        method: 'POST',
        url: 'https://example.com',
        bodyType: 'form-data',
      },
      makeEnv([]),
    );
    expect(result.bodyType).toBe('form-data');
  });

  it('returns request unchanged when environment is null', () => {
    const entries = [
      { id: '1', key: '{{field}}', value: '{{val}}', type: 'text' as const, enabled: true },
    ];
    const result = substituteInRequest(
      { method: 'POST', url: 'https://example.com', formDataEntries: entries },
      null,
    );
    expect(result.formDataEntries![0].key).toBe('{{field}}');
    expect(result.formDataEntries![0].value).toBe('{{val}}');
  });

  it('substitutes variables inside auth credentials', () => {
    const env = makeEnv([{ key: 'TOKEN', value: 'sekret', enabled: true }]);
    const result = substituteInRequest(
      {
        method: 'GET',
        url: 'https://example.com',
        auth: { type: 'bearer', bearer: { token: '{{TOKEN}}' } },
      },
      env,
    );
    expect(result.auth?.bearer?.token).toBe('sekret');
  });

  it('uses JSON-aware substitution for JSON bodies (typed unquote)', () => {
    const env = makeTypedEnv([{ key: 'userId', value: '42', type: 'number' }]);
    const result = substituteInRequest(
      {
        method: 'POST',
        url: 'https://example.com',
        body: '{"userId": "{{userId}}"}',
        bodyType: 'json',
      },
      env,
    );
    expect(result.body).toBe('{"userId": 42}');
  });

  it('keeps string substitution for non-JSON bodies', () => {
    const env = makeTypedEnv([{ key: 'userId', value: '42', type: 'number' }]);
    const result = substituteInRequest(
      {
        method: 'POST',
        url: 'https://example.com',
        body: '{"userId": "{{userId}}"}',
        bodyType: 'form-data',
      },
      env,
    );
    expect(result.body).toBe('{"userId": "42"}');
  });

  it('substitutes the GraphQL GET variables query parameter', () => {
    const env = makeTypedEnv([
      { key: 'userId', value: '42', type: 'number' },
      { key: 'name', value: 'alice', type: 'string' },
    ]);
    const variablesJson = encodeURIComponent('{"userId":"{{userId}}","name":"{{name}}"}');
    const result = substituteInRequest(
      { method: 'GET', url: `https://example.com/graphql?query={user}&variables=${variablesJson}` },
      env,
    );
    const parsed = new URL(result.url!);
    expect(JSON.parse(parsed.searchParams.get('variables')!)).toEqual({ userId: 42, name: 'alice' });
  });
});

describe('substituteInAuth', () => {
  const env = makeEnv([
    { key: 'USER', value: 'alice', enabled: true },
    { key: 'PASS', value: 'p4ss', enabled: true },
    { key: 'TOKEN', value: 'sekret', enabled: true },
    { key: 'KEY_NAME', value: 'X-Api-Key', enabled: true },
    { key: 'KEY_VAL', value: 'abc123', enabled: true },
  ]);

  it('substitutes basic auth username and password', () => {
    const result = substituteInAuth(
      { type: 'basic', basic: { username: '{{USER}}', password: '{{PASS}}' } },
      env,
    );
    expect(result?.basic).toEqual({ username: 'alice', password: 'p4ss' });
  });

  it('substitutes bearer token', () => {
    const result = substituteInAuth({ type: 'bearer', bearer: { token: '{{TOKEN}}' } }, env);
    expect(result?.bearer?.token).toBe('sekret');
  });

  it('substitutes api-key key and value', () => {
    const result = substituteInAuth(
      { type: 'api-key', apiKey: { key: '{{KEY_NAME}}', value: '{{KEY_VAL}}', addTo: 'header' } },
      env,
    );
    expect(result?.apiKey).toEqual({ key: 'X-Api-Key', value: 'abc123', addTo: 'header' });
  });

  it('substitutes digest username and password', () => {
    const result = substituteInAuth(
      { type: 'digest', digest: { username: '{{USER}}', password: '{{PASS}}' } },
      env,
    );
    expect(result?.digest).toEqual({ username: 'alice', password: 'p4ss' });
  });

  it('leaves oauth.configId untouched', () => {
    const auth = { type: 'oauth' as const, oauth: { configId: '{{TOKEN}}' } };
    const result = substituteInAuth(auth, env);
    expect(result?.oauth?.configId).toBe('{{TOKEN}}');
  });

  it('returns auth unchanged when environment is null', () => {
    const auth = { type: 'bearer' as const, bearer: { token: '{{TOKEN}}' } };
    expect(substituteInAuth(auth, null)).toEqual(auth);
  });

  it('returns undefined when auth is undefined', () => {
    expect(substituteInAuth(undefined, env)).toBeUndefined();
  });

  it('returns auth unchanged for type: none', () => {
    expect(substituteInAuth({ type: 'none' }, env)).toEqual({ type: 'none' });
  });
});

// GOTCHA: Fixtures mirrored in apps/backend/src/test/utils/variable-substitution.test.ts; keep in sync.
const mergeCollection: Collection = {
  id: 'col-1',
  name: 'Collection',
  folders: [],
  requests: [],
  variables: [
    { key: 'BASE_URL', value: 'https://collection.example', enabled: true },
    { key: 'ONLY_IN_COLLECTION', value: 'collection', enabled: true },
    { key: 'MASKED_BY_ENV', value: 'collection', enabled: true },
    { key: 'ENV_DISABLED_FALLBACK', value: 'collection', enabled: true },
    { key: 'TYPED', value: '42', enabled: true, type: 'number' },
    { key: 'LAST_WINS', value: 'first', enabled: true },
    { key: 'LAST_WINS', value: 'second', enabled: true },
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

describe('effectiveVariables', () => {
  it('environment wins over collection', () => {
    const scope = effectiveVariables(mergeEnv, mergeCollection);
    const vars = Object.fromEntries(scope.variables.map(v => [v.key, v.value]));
    expect(vars.BASE_URL).toBe('https://env.example');
    expect(vars.MASKED_BY_ENV).toBe('env');
  });

  it('disabled variable in a higher scope falls back to lower scopes', () => {
    const scope = effectiveVariables(mergeEnv, mergeCollection);
    const vars = Object.fromEntries(scope.variables.map(v => [v.key, v.value]));
    expect(vars.ENV_DISABLED_FALLBACK).toBe('collection');
  });

  it('resolves collection variables with no environment', () => {
    const scope = effectiveVariables(null, mergeCollection);
    const vars = Object.fromEntries(scope.variables.map(v => [v.key, v.value]));
    expect(vars.BASE_URL).toBe('https://collection.example');
    expect(substituteVariables('{{BASE_URL}}', scope)).toBe('https://collection.example');
  });

  it('currentValue wins over value', () => {
    const scope = effectiveVariables(mergeEnv, mergeCollection);
    const entry = scope.variables.find(v => v.key === 'CURRENT');
    expect(entry?.currentValue).toBe('current');
    expect(substituteVariables('{{CURRENT}}', scope)).toBe('current');
  });

  it('last duplicate key within a scope wins', () => {
    const scope = effectiveVariables(mergeEnv, mergeCollection);
    const vars = Object.fromEntries(scope.variables.map(v => [v.key, v.value]));
    expect(vars.LAST_WINS).toBe('second');
  });

  it('keeps variable types through the merge', () => {
    const scope = effectiveVariables(mergeEnv, mergeCollection);
    expect(substituteJsonVariables('{"id": "{{TYPED}}"}', scope)).toBe('{"id": 42}');
  });
});

// GOTCHA: Fixtures mirrored in apps/backend/src/test/utils/variable-substitution.test.ts; keep in sync.
describe('effectiveVariablesWithOverrides and scriptVariableRecords', () => {
  const overrideEnv: Environment = {
    id: 'env-9',
    name: 'Env',
    variables: [{ key: 'SHARED', value: 'from-env', enabled: true }],
  };

  const overrideCollection: Collection = {
    id: 'col-1',
    name: 'Collection',
    folders: [],
    requests: [],
    variables: [
      { key: 'SHARED', value: 'from-collection', enabled: true },
      { key: 'TYPED', value: '1', enabled: true, type: 'number' },
      { key: 'DISABLED', value: 'off', enabled: false },
    ],
  };

  it('script-set collection values beat their own scope but not the environment', () => {
    const scope = effectiveVariablesWithOverrides(overrideEnv, overrideCollection, {
      collection: { values: { SHARED: 'from-script' } },
    });
    expect(substituteVariables('{{SHARED}}', scope)).toBe('from-env');

    const withoutEnv = effectiveVariablesWithOverrides(null, overrideCollection, {
      collection: { values: { SHARED: 'from-script' } },
    });
    expect(substituteVariables('{{SHARED}}', withoutEnv)).toBe('from-script');
  });

  it('script-set values on a disabled variable still resolve', () => {
    const scope = effectiveVariablesWithOverrides(null, overrideCollection, {
      collection: { values: { DISABLED: 'scripted' } },
    });
    expect(substituteVariables('{{DISABLED}}', scope)).toBe('scripted');
  });

  it('cleared keys stop resolving in their own scope', () => {
    const scope = effectiveVariablesWithOverrides(null, overrideCollection, {
      collection: { values: {}, cleared: ['SHARED'] },
    });
    expect(substituteVariables('{{SHARED}}', scope)).toBe('{{SHARED}}');
  });

  it('appends script-created keys with the recorded type', () => {
    const scope = effectiveVariablesWithOverrides(null, overrideCollection, {
      collection: { values: { CREATED: '7' }, types: { CREATED: 'number' } },
    });
    expect(substituteJsonVariables('{"id": "{{CREATED}}"}', scope)).toBe('{"id": 7}');
  });

  it('re-types an existing variable from the script value', () => {
    const scope = effectiveVariablesWithOverrides(null, overrideCollection, {
      collection: { values: { TYPED: '9' }, types: { TYPED: 'string' } },
    });
    expect(substituteJsonVariables('{"id": "{{TYPED}}"}', scope)).toBe('{"id": "9"}');
  });

  it('mergeScriptOverrides lets a later set revive an earlier clear and vice versa', () => {
    const target: ScriptScopeOverrides = { values: {} };
    mergeScriptOverrides(target, { values: { A: '1', B: '1' } });
    mergeScriptOverrides(target, { values: {}, cleared: ['A'] });
    expect(target.values).toEqual({ B: '1' });
    expect(target.cleared).toEqual(['A']);

    mergeScriptOverrides(target, { values: { A: '2' } });
    expect(target.values).toEqual({ A: '2', B: '1' });
    expect(target.cleared).toEqual([]);

    mergeScriptOverrides(target, { values: {}, cleared: ['B'] });
    expect(target.values).toEqual({ A: '2' });
    expect(target.cleared).toEqual(['B']);
  });

  it('scriptVariableRecords layers overrides and removes cleared keys per scope', () => {
    const records = scriptVariableRecords(overrideCollection, {
      collection: { values: { SHARED: 'script-collection' }, types: { SHARED: 'string' } },
    });
    expect(records.collectionVariables).toEqual({ SHARED: 'script-collection', TYPED: '1' });
    expect(records.collectionVariableTypes).toEqual({ SHARED: 'string', TYPED: 'number' });
  });

  it('scriptVariableRecords applies current values and clears without overrides', () => {
    const collection: Collection = {
      ...overrideCollection,
      variables: [{ key: 'CURRENT', value: 'initial', currentValue: 'current', enabled: true }],
    };
    const records = scriptVariableRecords(collection, {
      collection: { values: {}, cleared: ['CURRENT'] },
    });
    expect(records.collectionVariables).toEqual({});
    expect(records.collectionVariableTypes).toBeUndefined();
  });
});
