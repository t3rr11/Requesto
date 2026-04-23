import { describe, it, expect } from 'vitest';
import { substituteInAuth, substituteVariables } from '../../utils/variable-substitution';
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
