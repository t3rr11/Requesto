/**
 * OAuth Store - Actions
 * Handles OAuth configuration management and token state
 */

import type { OAuthConfig, OAuthTokens } from '../../types';
import { API_BASE } from '../../helpers/api/config';
import { getTokens, storeTokens, removeTokens, isTokenExpired } from '../../helpers/oauth/tokenManager';

type SetState = (partial: any) => void;
type GetState = () => any;

/**
 * Fetch all OAuth configurations from backend
 */
async function getOAuthConfigsApi(): Promise<OAuthConfig[]> {
  const response = await fetch(`${API_BASE}/oauth/configs`);
  if (!response.ok) {
    throw new Error('Failed to load OAuth configurations');
  }
  return response.json();
}

/**
 * Create a new OAuth configuration
 */
async function createOAuthConfigApi(configData: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<OAuthConfig> {
  const response = await fetch(`${API_BASE}/oauth/configs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configData),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create OAuth configuration');
  }
  
  return response.json();
}

/**
 * Update an existing OAuth configuration
 */
async function updateOAuthConfigApi(id: string, updates: Partial<OAuthConfig>): Promise<OAuthConfig> {
  const response = await fetch(`${API_BASE}/oauth/configs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update OAuth configuration');
  }
  
  return response.json();
}

/**
 * Delete an OAuth configuration
 */
async function deleteOAuthConfigApi(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/oauth/configs/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete OAuth configuration');
  }
}

/**
 * Load OAuth configurations from backend
 */
export async function loadConfigs(set: SetState, get: GetState): Promise<void> {
  set({ isLoadingConfigs: true });
  try {
    const configs = await getOAuthConfigsApi();
    set({ configs });
    
    // Load token states for all configs
    loadAllTokenStates(get);
  } catch (error) {
    console.error('[OAuth Store] Failed to load OAuth configs:', error);
    throw error;
  } finally {
    set({ isLoadingConfigs: false });
  }
}

/**
 * Add new OAuth configuration
 */
export async function addConfig(
  set: SetState, 
  configData: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<OAuthConfig> {
  try {
    const newConfig = await createOAuthConfigApi(configData);
    
    set((state: any) => ({
      configs: [...state.configs, newConfig],
    }));
    
    return newConfig;
  } catch (error) {
    console.error('Failed to add OAuth config:', error);
    throw error;
  }
}

/**
 * Update existing OAuth configuration
 */
export async function updateConfig(
  set: SetState,
  id: string,
  updates: Partial<OAuthConfig>
): Promise<void> {
  try {
    const updatedConfig = await updateOAuthConfigApi(id, updates);
    
    set((state: any) => ({
      configs: state.configs.map((c: OAuthConfig) => c.id === id ? updatedConfig : c),
    }));
  } catch (error) {
    console.error('Failed to update OAuth config:', error);
    throw error;
  }
}

/**
 * Delete OAuth configuration
 */
export async function deleteConfig(
  set: SetState,
  _get: GetState,
  id: string
): Promise<void> {
  try {
    await deleteOAuthConfigApi(id);
    
    set((state: any) => ({
      configs: state.configs.filter((c: OAuthConfig) => c.id !== id),
    }));
    
    // Clear associated tokens
    clearTokens(set, id);
  } catch (error) {
    console.error('Failed to delete OAuth config:', error);
    throw error;
  }
}

/**
 * Get config by ID
 */
export function getConfig(get: GetState, id: string): OAuthConfig | null {
  return get().configs.find((c: OAuthConfig) => c.id === id) || null;
}

/**
 * Load token state for a specific config
 */
export function loadTokenState(set: SetState, _get: GetState, configId: string): void {
  const tokens = getTokens(configId);
  const isExpired = isTokenExpired(tokens);
  const expiresIn = tokens?.expiresAt 
    ? Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 1000))
    : null;
  
  set((state: any) => ({
    tokenState: {
      ...state.tokenState,
      [configId]: { tokens, isExpired, expiresIn },
    },
  }));
}

/**
 * Load token states for all configs
 */
export function loadAllTokenStates(get: GetState): void {
  const { configs, loadTokenState: loadTokenStateFn } = get();
  configs.forEach((config: OAuthConfig) => {
    loadTokenStateFn(config.id);
  });
}

/**
 * Store tokens
 */
export function setTokens(
  get: GetState,
  configId: string,
  tokens: OAuthTokens,
  storageType: OAuthConfig['tokenStorage']
): void {
  storeTokens(configId, tokens, storageType);
  get().loadTokenState(configId);
}

/**
 * Clear tokens for a config
 */
export function clearTokens(set: SetState, configId: string): void {
  removeTokens(configId);
  set((state: any) => ({
    tokenState: {
      ...state.tokenState,
      [configId]: { tokens: null, isExpired: true, expiresIn: null },
    },
  }));
}

/**
 * Clear all tokens
 */
export function clearAllTokens(set: SetState, get: GetState): void {
  const { configs } = get();
  configs.forEach((config: OAuthConfig) => {
    removeTokens(config.id);
  });
  set({ tokenState: {} });
}

// ============================================================================
// Store Actions - Authentication State
// ============================================================================

/**
 * Set authenticating state
 */
export function setAuthenticating(set: SetState, configId: string, isAuthenticating: boolean): void {
  set((state: any) => ({
    isAuthenticating: {
      ...state.isAuthenticating,
      [configId]: isAuthenticating,
    },
  }));
}

/**
 * Set error
 */
export function setError(set: SetState, _get: GetState, configId: string, error: string | null): void {
  if (error) {
    set((state: any) => ({
      errors: {
        ...state.errors,
        [configId]: error,
      },
    }));
  } else {
    clearError(set, configId);
  }
}

/**
 * Clear error
 */
export function clearError(set: SetState, configId: string): void {
  set((state: any) => {
    const { [configId]: _, ...rest } = state.errors;
    return { errors: rest };
  });
}
