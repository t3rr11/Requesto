import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEnvironmentStore as useEnvironmentsStore } from '../../store/environments/store';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('environments store', () => {
  beforeEach(() => {
    useEnvironmentsStore.setState({
      environmentsData: { activeEnvironmentId: null, environments: [] },
      loading: false,
    });
    mockFetch.mockReset();
  });

  it('starts with empty state', () => {
    const state = useEnvironmentsStore.getState();
    expect(state.environmentsData.environments).toEqual([]);
    expect(state.environmentsData.activeEnvironmentId).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('loads environments from API', async () => {
    const mockData = {
      activeEnvironmentId: 'env1',
      environments: [{ id: 'env1', name: 'Dev', variables: [] }],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    await useEnvironmentsStore.getState().loadEnvironments();
    const state = useEnvironmentsStore.getState();
    expect(state.environmentsData.environments).toHaveLength(1);
    expect(state.environmentsData.activeEnvironmentId).toBe('env1');
  });

  it('sets active environment', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        activeEnvironmentId: 'env2',
        environments: [{ id: 'env2', name: 'Prod', variables: [] }],
      }),
    });
    await useEnvironmentsStore.getState().setActiveEnvironment('env2');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('adds environment locally', () => {
    const env = { id: 'env3', name: 'Staging', variables: [] };
    useEnvironmentsStore.getState().addEnvironment(env as any);
    expect(useEnvironmentsStore.getState().environmentsData.environments).toContainEqual(env);
  });

  it('updates environment locally', () => {
    const env = { id: 'env1', name: 'Dev', variables: [] } as any;
    useEnvironmentsStore.setState({
      environmentsData: { activeEnvironmentId: null, environments: [env] },
      loading: false,
    });
    useEnvironmentsStore.getState().updateEnvironment({ id: 'env1', name: 'Development', variables: [] } as any);
    const updated = useEnvironmentsStore.getState().environmentsData.environments.find(
      (e) => e.id === 'env1',
    );
    expect(updated?.name).toBe('Development');
  });

  it('saves environment via API', async () => {
    const env = { id: 'env1', name: 'Dev', variables: [] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    await useEnvironmentsStore.getState().saveEnvironment(env as any);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('deletes environment via API', async () => {
    useEnvironmentsStore.setState({
      environmentsData: {
        activeEnvironmentId: null,
        environments: [{ id: 'env1', name: 'Dev', variables: [] } as any],
      },
      loading: false,
    });
    mockFetch.mockResolvedValueOnce({ ok: true });
    await useEnvironmentsStore.getState().deleteEnvironment('env1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(useEnvironmentsStore.getState().environmentsData.environments).toHaveLength(0);
  });

  it('throws on API failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(useEnvironmentsStore.getState().loadEnvironments()).rejects.toThrow();
  });
});
