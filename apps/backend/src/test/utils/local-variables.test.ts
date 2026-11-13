import { describe, it, expect } from 'vitest';
import {
  withCurrentValues,
  withoutCurrentValues,
  toLocalVariable,
  type LocalVariable,
} from '../../utils/local-variables';
import type { EnvironmentVariable } from '../../models/environment';

const makeVar = (key: string, value: string, overrides: Partial<EnvironmentVariable> = {}): EnvironmentVariable => ({
  key,
  value,
  enabled: true,
  ...overrides,
});

describe('withCurrentValues', () => {
  it('returns the same reference when there are no overrides', () => {
    const variables = [makeVar('a', '1')];
    expect(withCurrentValues(variables, {})).toBe(variables);
  });

  it('applies overrides to existing keys and preserves untouched entries', () => {
    const variables = [makeVar('a', 'initial'), makeVar('b', 'initial')];
    const result = withCurrentValues(variables, { a: { value: 'current' } });
    expect(result).toEqual([
      makeVar('a', 'initial', { currentValue: 'current' }),
      makeVar('b', 'initial'),
    ]);
  });

  it('appends unknown keys as read-back entries', () => {
    const result = withCurrentValues(undefined, { created: { value: 'new' } });
    expect(result).toEqual([{ key: 'created', value: '', currentValue: 'new', enabled: true }]);
  });

  it('carries the recorded type, replacing the variable type when provided', () => {
    const variables = [makeVar('a', 'initial', { type: 'string' })];
    const result = withCurrentValues(variables, { a: { value: '1', type: 'number' } });
    expect(result).toEqual([makeVar('a', 'initial', { currentValue: '1', type: 'number' })]);
  });
});

describe('withoutCurrentValues', () => {
  it('strips current values and keeps everything else', () => {
    const variables = [
      makeVar('a', 'initial', { currentValue: 'current', type: 'number', isSecret: true }),
      makeVar('b', 'initial'),
    ];
    expect(withoutCurrentValues(variables)).toEqual([
      makeVar('a', 'initial', { type: 'number', isSecret: true }),
      makeVar('b', 'initial'),
    ]);
  });

  it('passes undefined through', () => {
    expect(withoutCurrentValues(undefined)).toBeUndefined();
  });
});

describe('toLocalVariable', () => {
  it('normalises legacy plain-string entries', () => {
    expect(toLocalVariable('value-only')).toEqual({ value: 'value-only' });
  });

  it('keeps typed entries as-is', () => {
    const entry: LocalVariable = { value: '1', type: 'number' };
    expect(toLocalVariable(entry)).toEqual(entry);
  });
});
