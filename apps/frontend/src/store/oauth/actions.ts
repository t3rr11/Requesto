import type { OAuthConfig, OAuthTokens } from './types';
import { API_BASE } from '../../helpers/api/config';
import { getTokens, storeTokens, removeTokens, isTokenExpired } from '../../helpers/oauth/tokenManager';

type SetState = (partial: Record<string, unknown> | ((state: Record<string, unknown>) => Record<string, unknown>)) => void;
type GetState = () => Record<string, unknown>;

// ── Internal API helpers ─────────────────────────────────────────────────────

async function getOAuthConfigsApi(): Promise<OAuthConfig[]> {
  const res = await fetch(`${API_BASE}/oauth/configs`);
  if (!res.ok) throw new Error('Failed to load OAuth configurations');
  return res.json();
}

async function createOAuthConfigApi(
  configData: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'>,
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

// ── Config actions ───────────────────────────────────────────────────────────

export async function loadConfigs(set: SetState, get: GetState): Promise<void> {
  set({ isLoadingConfigs: true });
  try {
    const configs = await getOAuthConfigsApi();
    set({ configs });
    loadAllTokenStates(get);
  } catch (error) {
    console.error('Failed to load OAuth configs:', error);
    throw error;
  } finally {
    set({ isLoadingConfigs: false });
  }
}

export async function addConfig(
  set: SetState,
  configData: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'>,
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
    set((state) => ({
      configs: (state.configs as OAuthConfig[]).filter((c) => c.id !== id),
    }));
    clearTokens(set, id);
  } catch (error) {
    console.error('Failed to delete OAuth config:', error);
    throw error;
  }
}

export function getConfig(get: GetState, id: string): OAuthConfig | null {
  return (get().configs as OAuthConfig[]).find((c) => c.id === id) ?? null;
}

// ── Token state ──────────────────────────────────────────────────────────────

export function loadTokenState(set: SetState, configId: string): void {
  const tokens = getTokens(configId);
  const expired = isTokenExpired(tokens);
  const expiresIn = tokens?.expiresAt
    ? Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 1000))
    : null;

  set((state) => ({
    tokenState: {
      ...(state.tokenState as Record<string, unknown>),
      [configId]: { tokens, isExpired: expired, expiresIn },
    },
  }));
}

export function loadAllTokenStates(get: GetState): void {
  const state = get();
  const configs = state.configs as OAuthConfig[];
  const loadFn = state.loadTokenState as (configId: string) => void;
  configs.forEach((c) => loadFn(c.id));
}

export function setTokens(
  get: GetState, configId: string, tokens: OAuthTokens, storageType: OAuthConfig['tokenStorage'],
): void {
  storeTokens(configId, tokens, storageType);
  const loadFn = get().loadTokenState as (configId: string) => void;
  loadFn(configId);
}

export function clearTokens(set: SetState, configId: string): void {
  removeTokens(configId);
  set((state) => ({
    tokenState: {
      ...(state.tokenState as Record<string, unknown>),
      [configId]: { tokens: null, isExpired: true, expiresIn: null },
    },
  }));
}

export function clearAllTokens(set: SetState, get: GetState): void {
  const configs = get().configs as OAuthConfig[];
  configs.forEach((c) => removeTokens(c.id));
  set({ tokenState: {} });
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
