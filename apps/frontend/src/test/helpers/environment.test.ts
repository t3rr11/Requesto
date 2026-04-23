import { describe, it, expect } from 'vitest';
import {
  substituteVariables,
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
} from '../../helpers/environment';
import type { Environment } from '../../store/environments/types';

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
