import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVariableScope } from '../../hooks/useVariableScope';
import { useEnvironmentStore } from '../../store/environments/store';
import { useCollectionsStore } from '../../store/collections/store';
import type { Collection } from '../../store/collections/types';

const environment = {
  id: 'env-1',
  name: 'Development',
  variables: [
    { key: 'host', value: 'env-host', enabled: true },
    { key: 'token', value: 'env-token', enabled: true, isSecret: true },
  ],
};

const collection: Collection = {
  id: 'col-1',
  name: 'API',
  folders: [],
  requests: [],
  variables: [
    { key: 'host', value: 'collection-host', enabled: true },
    { key: 'apiKey', value: 'collection-key', enabled: true },
    { key: 'disabled', value: 'nope', enabled: false },
  ],
};

describe('useVariableScope', () => {
  beforeEach(() => {
    act(() => {
      useEnvironmentStore.setState({
        environmentsData: { activeEnvironmentId: 'env-1', environments: [environment] },
      });
      useCollectionsStore.setState({ collections: [collection] });
    });
  });

  it('merges environment and collection variables', () => {
    const { result } = renderHook(() => useVariableScope('col-1'));
    const keys = result.current.variables.map(v => v.key).sort();
    expect(keys).toEqual(['apiKey', 'host', 'token']);
  });

  it('lets the environment win over the collection for shared keys', () => {
    const { result } = renderHook(() => useVariableScope('col-1'));
    const host = result.current.variables.find(v => v.key === 'host');
    expect(host?.value).toBe('env-host');
  });

  it('uses the collection value when only the collection defines the key', () => {
    const { result } = renderHook(() => useVariableScope('col-1'));
    const apiKey = result.current.variables.find(v => v.key === 'apiKey');
    expect(apiKey?.value).toBe('collection-key');
  });

  it('drops disabled collection variables', () => {
    const { result } = renderHook(() => useVariableScope('col-1'));
    expect(result.current.variables.some(v => v.key === 'disabled')).toBe(false);
  });

  it('reports the winning source per key', () => {
    const { result } = renderHook(() => useVariableScope('col-1'));
    expect(result.current.getSource('host')).toEqual({ scope: 'Environment', name: 'Development' });
    expect(result.current.getSource('apiKey')).toEqual({ scope: 'Collection', name: 'API' });
    expect(result.current.getSource('disabled')).toBeUndefined();
  });

  it('falls back to environment variables without a collection id', () => {
    const { result } = renderHook(() => useVariableScope());
    const keys = result.current.variables.map(v => v.key).sort();
    expect(keys).toEqual(['host', 'token']);
    expect(result.current.getSource('apiKey')).toBeUndefined();
    expect(result.current.getSource('host')).toEqual({ scope: 'Environment', name: 'Development' });
  });

  it('resolves collection variables with no active environment', () => {
    act(() => {
      useEnvironmentStore.setState({
        environmentsData: { activeEnvironmentId: null, environments: [environment] },
      });
    });
    const { result } = renderHook(() => useVariableScope('col-1'));
    const host = result.current.variables.find(v => v.key === 'host');
    expect(host?.value).toBe('collection-host');
    expect(result.current.getSource('host')).toEqual({ scope: 'Collection', name: 'API' });
  });
});
