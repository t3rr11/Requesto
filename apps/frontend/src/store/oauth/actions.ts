import type { OAuthConfig, OAuthTokenStatus } from './types';
import { API_BASE } from '../../helpers/api/config';

type SetState = (partial: Record<string, unknown> | ((state: Record<string, unknown>) => Record<string, unknown>)) => void;
type GetState = () => Record<string, unknown>;

// ── Internal API helpers ─────────────────────────────────────────────────────

async function getOAuthConfigsApi(): Promise<OAuthConfig[]> {
  const res = await fetch(`${API_BASE}/oauth/configs`);
  if (!res.ok) throw new Error('Failed to load OAuth configurations');
  return res.json();
}

async function createOAuthConfigApi(
  configData: Omit<OAuthConfig, 'id'>,
): Promise<OAuthConfig> {
  const res = await fetch(`${API_BASE}/oauth/configs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configData),
  });
  if (!res.ok) throw new Error('Failed to create OAuth configuration');
  return res.json();
}

async function updateOAuthConfigApi(id: string, updates: Partial<OAuthConfig>): Promise<OAuthConfig> {
  const res = await fetch(`${API_BASE}/oauth/configs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update OAuth configuration');
  return res.json();
}

async function deleteOAuthConfigApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/oauth/configs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete OAuth configuration');
}

async function getTokenStatusApi(id: string): Promise<OAuthTokenStatus> {
  const res = await fetch(`${API_BASE}/oauth/configs/${id}/tokens`);
  if (!res.ok) throw new Error('Failed to load OAuth token status');
  return res.json();
}

async function clearTokensApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/oauth/configs/${id}/tokens`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear OAuth tokens');
}

// ── Config actions ───────────────────────────────────────────────────────────

export async function loadConfigs(set: SetState, get: GetState): Promise<void> {
  set({ isLoadingConfigs: true });
  try {
    const configs = await getOAuthConfigsApi();
    set({ configs });
    await loadAllTokenStatuses(set, configs);
  } catch (error) {
    console.error('Failed to load OAuth configs:', error);
    throw error;
  } finally {
    set({ isLoadingConfigs: false });
  }
  void get;
}

export async function addConfig(
  set: SetState,
  configData: Omit<OAuthConfig, 'id'>,
): Promise<OAuthConfig> {
  try {
    const newConfig = await createOAuthConfigApi(configData);
    set((state) => ({
      configs: [...(state.configs as OAuthConfig[]), newConfig],
    }));
    return newConfig;
  } catch (error) {
    console.error('Failed to add OAuth config:', error);
    throw error;
  }
}

export async function updateConfig(
  set: SetState, id: string, updates: Partial<OAuthConfig>,
): Promise<void> {
  try {
    const updated = await updateOAuthConfigApi(id, updates);
    set((state) => ({
      configs: (state.configs as OAuthConfig[]).map((c) => (c.id === id ? updated : c)),
    }));
  } catch (error) {
    console.error('Failed to update OAuth config:', error);
    throw error;
  }
}

export async function deleteConfig(set: SetState, _get: GetState, id: string): Promise<void> {
  try {
    await deleteOAuthConfigApi(id);
    set((state) => {
      const tokenStatuses = { ...(state.tokenStatuses as Record<string, OAuthTokenStatus>) };
      delete tokenStatuses[id];
      return {
        configs: (state.configs as OAuthConfig[]).filter((c) => c.id !== id),
        tokenStatuses,
      };
    });
  } catch (error) {
    console.error('Failed to delete OAuth config:', error);
    throw error;
  }
}

export function getConfig(get: GetState, id: string): OAuthConfig | null {
  return (get().configs as OAuthConfig[]).find((c) => c.id === id) ?? null;
}

// ── Token status (read-through cache from backend) ───────────────────────────

const EMPTY_STATUS: OAuthTokenStatus = { hasToken: false, hasRefreshToken: false, isExpired: true };

export async function loadTokenStatus(set: SetState, configId: string): Promise<void> {
  if (!configId) return;
  try {
    const status = await getTokenStatusApi(configId);
    set((state) => ({
      tokenStatuses: {
        ...(state.tokenStatuses as Record<string, OAuthTokenStatus>),
        [configId]: status,
      },
    }));
  } catch (error) {
    console.error('Failed to load token status:', error);
    set((state) => ({
      tokenStatuses: {
        ...(state.tokenStatuses as Record<string, OAuthTokenStatus>),
        [configId]: EMPTY_STATUS,
      },
    }));
  }
}

export async function loadAllTokenStatuses(set: SetState, configs: OAuthConfig[]): Promise<void> {
  await Promise.all(configs.map((c) => loadTokenStatus(set, c.id)));
}

export async function clearTokens(set: SetState, configId: string): Promise<void> {
  if (!configId) return;
  try {
    await clearTokensApi(configId);
  } finally {
    set((state) => ({
      tokenStatuses: {
        ...(state.tokenStatuses as Record<string, OAuthTokenStatus>),
        [configId]: EMPTY_STATUS,
      },
    }));
  }
}

// ── Auth state ───────────────────────────────────────────────────────────────

export function setAuthenticating(set: SetState, configId: string, isAuth: boolean): void {
  set((state) => ({
    isAuthenticating: { ...(state.isAuthenticating as Record<string, boolean>), [configId]: isAuth },
  }));
}

export function setError(set: SetState, configId: string, error: string | null): void {
  if (error) {
    set((state) => ({
      errors: { ...(state.errors as Record<string, string>), [configId]: error },
    }));
  } else {
    clearError(set, configId);
  }
}

export function clearError(set: SetState, configId: string): void {
  set((state) => {
    const errors = { ...(state.errors as Record<string, string>) };
    delete errors[configId];
    return { errors };
  });
}
