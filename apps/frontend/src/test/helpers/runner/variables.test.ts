import { describe, it, expect } from 'vitest';
import { applyScriptOutcome, runnerVariableRows, type RunnerVariablesState } from '../../../helpers/runner/variables';
import type { ScriptOverrideSet } from '../../../helpers/environment';
import type { Collection } from '../../../store/collections/types';
import type { Environment } from '../../../store/environments/types';

function makeEnvironment(variables: Environment['variables']): Environment {
  return { id: 'env-1', name: 'Local', variables };
}

function makeCollection(variables: Collection['variables']): Collection {
  return { id: 'col-1', name: 'First', folders: [], requests: [], variables };
}

function makeState(): RunnerVariablesState {
  return {
    seq: 0,
    baseline: { env: { token: 'base' }, collections: { 'col-1': { host: 'base' } } },
    overrides: { env: { values: {} }, collections: {} },
    changes: { env: {}, collections: {} },
    history: {},
  };
}

describe('runnerVariableRows', () => {
  it('shows the merged effective list', () => {
    const environment = makeEnvironment([
      { key: 'host', value: 'env-host', enabled: true },
      { key: 'port', value: '8080', enabled: true, type: 'number' },
    ]);
    const collection = makeCollection([
      { key: 'host', value: 'collection-host', enabled: true },
      { key: 'region', value: 'eu', enabled: true },
    ]);

    expect(runnerVariableRows(environment, collection)).toEqual([
      { key: 'host', value: 'env-host', isSecret: false },
      { key: 'region', value: 'eu', isSecret: false },
      { key: 'port', value: '8080', type: 'number', isSecret: false },
    ]);
  });

  it('drops disabled and empty-keyed variables', () => {
    const environment = makeEnvironment([
      { key: 'off', value: 'env', enabled: false },
      { key: '', value: 'blank', enabled: true },
    ]);
    const collection = makeCollection([{ key: 'only', value: 'v', enabled: false }]);

    expect(runnerVariableRows(environment, collection)).toEqual([]);
  });

  it('lets a disabled environment variable fall back to the collection', () => {
    const environment = makeEnvironment([{ key: 'host', value: 'env-host', enabled: false }]);
    const collection = makeCollection([{ key: 'host', value: 'collection-host', enabled: true }]);

    expect(runnerVariableRows(environment, collection)).toEqual([
      { key: 'host', value: 'collection-host', isSecret: false },
    ]);
  });

  it('uses current values over initial values', () => {
    const environment = makeEnvironment([
      { key: 'token', value: 'initial', currentValue: 'runtime', enabled: true },
    ]);

    expect(runnerVariableRows(environment, null)[0].value).toBe('runtime');
  });

  it('shows script-set collection values, including script-created keys', () => {
    const collection = makeCollection([{ key: 'host', value: 'base', enabled: true }]);
    const overrides: ScriptOverrideSet = {
      collection: { values: { host: 'scripted', fresh: 'made' } },
    };

    expect(runnerVariableRows(null, collection, overrides)).toEqual([
      { key: 'host', value: 'scripted', isSecret: false },
      { key: 'fresh', value: 'made', type: 'string', isSecret: false },
    ]);
  });

  it('keeps the environment above a script-set collection value', () => {
    const environment = makeEnvironment([{ key: 'host', value: 'env-host', enabled: true }]);
    const collection = makeCollection([{ key: 'host', value: 'base', enabled: true }]);
    const overrides: ScriptOverrideSet = {
      collection: { values: { host: 'scripted' } },
    };

    expect(runnerVariableRows(environment, collection, overrides)).toEqual([
      { key: 'host', value: 'env-host', isSecret: false },
    ]);
  });

  it('shows script-created environment keys alongside the base list', () => {
    const environment = makeEnvironment([{ key: 'known', value: 'env', enabled: true }]);
    const overrides: ScriptOverrideSet = {
      env: { values: { known: 'env', created: 'script' } },
    };

    expect(runnerVariableRows(environment, null, overrides)).toEqual([
      { key: 'known', value: 'env', isSecret: false },
      { key: 'created', value: 'script', type: 'string', isSecret: false },
    ]);
  });

  it('drops script-cleared collection keys, with environment fallback', () => {
    const environment = makeEnvironment([{ key: 'shared', value: 'env', enabled: true }]);
    const collection = makeCollection([
      { key: 'shared', value: 'collection', enabled: true },
      { key: 'gone', value: 'bye', enabled: true },
    ]);
    const overrides: ScriptOverrideSet = {
      collection: { values: {}, cleared: ['shared', 'gone'] },
    };

    expect(runnerVariableRows(environment, collection, overrides)).toEqual([
      { key: 'shared', value: 'env', isSecret: false },
    ]);
  });

  it('keeps secret and type flags for masking and JSON substitution', () => {
    const environment = makeEnvironment([
      { key: 'secret', value: 's3cret', enabled: true, isSecret: true },
      { key: 'count', value: '5', enabled: true, type: 'number' },
    ]);

    expect(runnerVariableRows(environment, null)).toEqual([
      { key: 'secret', value: 's3cret', isSecret: true },
      { key: 'count', value: '5', type: 'number', isSecret: false },
    ]);
  });
});

describe('applyScriptOutcome', () => {
  it('stamps environment changes and appends to the request history', () => {
    const environment = makeEnvironment([{ key: 'token', value: 'base', enabled: true }]);
    const next = applyScriptOutcome(
      makeState(),
      { envOverrides: { token: 'one' } },
      undefined,
      'pre',
      { id: 'r1', label: 'GET Root Request' },
      environment,
      [],
    );

    expect(next.seq).toBe(1);
    expect(next.overrides.env.values).toEqual({ token: 'one' });
    expect(next.changes.env.token).toEqual({ seq: 1, requestId: 'r1', label: 'GET Root Request', phase: 'pre' });
    expect(next.history.r1).toEqual([
      { seq: 1, key: 'token', from: 'base', to: 'one', isSecret: false, phase: 'pre', scopeLabel: 'Environment' },
    ]);
  });

  it('attributes collection outcomes to the collection scope', () => {
    const collection = makeCollection([{ key: 'host', value: 'base', enabled: true }]);
    const next = applyScriptOutcome(
      makeState(),
      { envOverrides: {}, collectionOverrides: { host: 'scripted' } },
      { collectionId: 'col-1' },
      'test',
      { id: 'r1', label: 'GET Root Request' },
      null,
      [collection],
    );

    expect(next.overrides.collections['col-1']?.values).toEqual({ host: 'scripted' });
    expect(next.changes.collections['col-1']?.host).toEqual({
      seq: 1, requestId: 'r1', label: 'GET Root Request', phase: 'test',
    });
    expect(next.history.r1?.[0].scopeLabel).toBe('First');
  });

  it('merges overrides without stamping when nothing is recording', () => {
    const next = applyScriptOutcome(
      makeState(),
      { envOverrides: { token: 'one' } },
      undefined,
      'pre',
      null,
      null,
      [],
    );

    expect(next.seq).toBe(1);
    expect(next.overrides.env.values).toEqual({ token: 'one' });
    expect(next.changes.env).toEqual({});
    expect(next.history).toEqual({});
  });
});
