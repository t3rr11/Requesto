import { describe, expect, it } from 'vitest';
import { applyVarOverrides, collectEnvVars, normalizeKey, parseEnvFile, parseKeyValuePairs } from '../src/vars';
import { CliError } from '../src/cli-error';

describe('normalizeKey', () => {
  it('uppercases and replaces non-alphanumerics', () => {
    expect(normalizeKey('my-app:auth')).toBe('MY_APP_AUTH');
    expect(normalizeKey('ci-auth')).toBe('CI_AUTH');
    expect(normalizeKey('baseUrl')).toBe('BASEURL');
  });
});

describe('parseKeyValuePairs', () => {
  it('splits on the first =', () => {
    const map = parseKeyValuePairs(['k=v=w', 'a=b']);
    expect(map.get('k')).toBe('v=w');
    expect(map.get('a')).toBe('b');
  });

  it('rejects malformed pairs', () => {
    expect(() => parseKeyValuePairs(['noequals'])).toThrow(CliError);
    expect(() => parseKeyValuePairs(['=value'])).toThrow(CliError);
  });
});

describe('parseEnvFile', () => {
  it('parses KEY=VALUE lines with comments, quotes and export prefixes', () => {
    const map = parseEnvFile(
      ['# comment', 'A=1', 'export B="two words"', "C='single'", '', 'D='].join('\n'),
    );
    expect(map.get('A')).toBe('1');
    expect(map.get('B')).toBe('two words');
    expect(map.get('C')).toBe('single');
    expect(map.get('D')).toBe('');
  });
});

describe('collectEnvVars', () => {
  it('collects prefixed environment variables', () => {
    process.env.REQUESTO_TESTER_FOO = '1';
    process.env.REQUESTO_TESTER_BAR_BAZ = '2';
    try {
      const map = collectEnvVars('REQUESTO_TESTER_');
      expect(map.get('REQUESTO_TESTER_FOO')).toBe('1');
      expect(map.get('REQUESTO_TESTER_BAR_BAZ')).toBe('2');
      expect(map.has('REQUESTO_TESTER')).toBe(false);
    } finally {
      delete process.env.REQUESTO_TESTER_FOO;
      delete process.env.REQUESTO_TESTER_BAR_BAZ;
    }
  });
});

describe('applyVarOverrides', () => {
  const env = {
    id: 'e1',
    name: 'env',
    variables: [
      { key: 'baseUrl', value: 'http://default', enabled: true },
      { key: 'api_key', value: 'default', enabled: true, isSecret: true },
    ],
  };

  it('overrides existing variables via currentValue', () => {
    const merged = applyVarOverrides(env, new Map([['baseUrl', 'http://ci']]));
    expect(merged?.variables[0].currentValue).toBe('http://ci');
    expect(merged?.variables[0].value).toBe('http://default');
  });

  it('matches keys case-insensitively via normalisation', () => {
    const merged = applyVarOverrides(env, new Map([['API_KEY', 'from-ci']]));
    expect(merged?.variables[1].currentValue).toBe('from-ci');
  });

  it('appends unknown keys as new variables', () => {
    const merged = applyVarOverrides(env, new Map([['extra', 'x']]));
    expect(merged?.variables).toHaveLength(3);
    expect(merged?.variables[2]).toEqual({ key: 'extra', value: 'x', currentValue: 'x', enabled: true });
  });

  it('creates a synthetic environment when none exists', () => {
    const merged = applyVarOverrides(null, new Map([['a', 'b']]));
    expect(merged?.variables).toEqual([{ key: 'a', value: 'b', currentValue: 'b', enabled: true }]);
  });

  it('returns the original environment when there are no overrides', () => {
    expect(applyVarOverrides(env, new Map())).toBe(env);
    expect(applyVarOverrides(null, new Map())).toBeNull();
  });
});
