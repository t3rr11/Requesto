import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOAuthStore } from '../../store/oauth/store';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('oauth store', () => {
  beforeEach(() => {
    useOAuthStore.setState({
      configs: [],
      tokenState: {},
      isLoadingConfigs: false,
      isAuthenticating: {},
      errors: {},
    });
    mockFetch.mockReset();
  });

  it('starts with empty state', () => {
    const state = useOAuthStore.getState();
    expect(state.configs).toEqual([]);
    expect(state.tokenState).toEqual({});
    expect(state.isLoadingConfigs).toBe(false);
  });

  it('sets authenticating state', () => {
    useOAuthStore.getState().setAuthenticating('cfg1', true);
    expect(useOAuthStore.getState().isAuthenticating['cfg1']).toBe(true);
    useOAuthStore.getState().setAuthenticating('cfg1', false);
    expect(useOAuthStore.getState().isAuthenticating['cfg1']).toBe(false);
  });

  it('sets and clears error for a config', () => {
    useOAuthStore.getState().setError('cfg1', 'Token expired');
    expect(useOAuthStore.getState().errors['cfg1']).toBe('Token expired');
    useOAuthStore.getState().clearError('cfg1');
    expect(useOAuthStore.getState().errors['cfg1']).toBeUndefined();
  });

  it('sets error to null clears it', () => {
    useOAuthStore.getState().setError('cfg1', 'Something went wrong');
    useOAuthStore.getState().setError('cfg1', null);
    expect(useOAuthStore.getState().errors['cfg1']).toBeUndefined();
  });

  it('loads configs from API', async () => {
    const mockConfigs = [
      { id: 'cfg1', name: 'Test OAuth', grantType: 'authorization-code', clientId: 'abc', tokenUrl: 'https://example.com/token', authorizationUrl: 'https://example.com/auth', tokenStorage: 'session' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConfigs),
    });
    await useOAuthStore.getState().loadConfigs();
    expect(useOAuthStore.getState().configs).toEqual(mockConfigs);
    expect(useOAuthStore.getState().isLoadingConfigs).toBe(false);
  });

  it('throws when loadConfigs fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(useOAuthStore.getState().loadConfigs()).rejects.toThrow();
    expect(useOAuthStore.getState().isLoadingConfigs).toBe(false);
  });

  it('adds a config via API', async () => {
    const newConfig = { id: 'cfg2', name: 'New Config', grantType: 'client-credentials', clientId: 'xyz', tokenUrl: 'https://example.com/token', tokenStorage: 'session' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(newConfig),
    });
    const result = await useOAuthStore.getState().addConfig({
      name: 'New Config',
      grantType: 'client-credentials',
      clientId: 'xyz',
      tokenUrl: 'https://example.com/token',
      tokenStorage: 'session',
    } as any);
    expect(result).toEqual(newConfig);
    expect(useOAuthStore.getState().configs).toContainEqual(newConfig);
  });

  it('updates a config via API', async () => {
    useOAuthStore.setState({
      configs: [{ id: 'cfg1', name: 'Old Name', grantType: 'authorization-code' } as any],
    });
    const updated = { id: 'cfg1', name: 'Updated Name', grantType: 'authorization-code' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(updated),
    });
    await useOAuthStore.getState().updateConfig('cfg1', { name: 'Updated Name' });
    expect(useOAuthStore.getState().configs[0].name).toBe('Updated Name');
  });

  it('deletes a config via API', async () => {
    useOAuthStore.setState({
      configs: [{ id: 'cfg1', name: 'To Delete' } as any],
    });
    mockFetch.mockResolvedValueOnce({ ok: true });
    await useOAuthStore.getState().deleteConfig('cfg1');
    expect(useOAuthStore.getState().configs).toHaveLength(0);
  });

  it('gets a config by ID', () => {
    const config = { id: 'cfg1', name: 'Test Config' } as any;
    useOAuthStore.setState({ configs: [config] });
    expect(useOAuthStore.getState().getConfig('cfg1')).toEqual(config);
    expect(useOAuthStore.getState().getConfig('nonexistent')).toBeNull();
  });

  it('clears tokens for a config', () => {
    useOAuthStore.setState({
      tokenState: {
        cfg1: { tokens: { accessToken: 'abc' } as any, isExpired: false, expiresIn: 3600 },
      },
    });
    useOAuthStore.getState().clearTokens('cfg1');
    const entry = useOAuthStore.getState().tokenState['cfg1'];
    expect(entry.tokens).toBeNull();
    expect(entry.isExpired).toBe(true);
  });

  it('clears all tokens', () => {
    useOAuthStore.setState({
      configs: [{ id: 'cfg1' }, { id: 'cfg2' }] as any[],
      tokenState: {
        cfg1: { tokens: { accessToken: 'a' } as any, isExpired: false, expiresIn: 100 },
        cfg2: { tokens: { accessToken: 'b' } as any, isExpired: false, expiresIn: 200 },
      },
    });
    useOAuthStore.getState().clearAllTokens();
    expect(useOAuthStore.getState().tokenState).toEqual({});
  });
});
