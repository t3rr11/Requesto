/**
 * OAuth Store - State Definition
 * Manages OAuth configurations and token state
 */

import { create } from 'zustand';
import { OAuthConfig, OAuthTokens } from '../../types';
import { 
  loadConfigs, 
  addConfig, 
  updateConfig, 
  deleteConfig, 
  getConfig,
  loadTokenState, 
  loadAllTokenStates, 
  setTokens, 
  clearTokens, 
  clearAllTokens,
  setAuthenticating,
  setError,
  clearError
} from './actions';

interface OAuthState {
  // OAuth configurations (stored on backend, cached here)
  configs: OAuthConfig[];
  
  // Currently loaded token state (for UI display)
  tokenState: Record<string, {
    tokens: OAuthTokens | null;
    isExpired: boolean;
    expiresIn: number | null;
  }>;
  
  // Loading states
  isLoadingConfigs: boolean;
  isAuthenticating: Record<string, boolean>;
  
  // Errors
  errors: Record<string, string>;
  
  // Actions
  loadConfigs: () => Promise<void>;
  addConfig: (config: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<OAuthConfig>;
  updateConfig: (id: string, updates: Partial<OAuthConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  getConfig: (id: string) => OAuthConfig | null;
  
  // Token management
  loadTokenState: (configId: string) => void;
  loadAllTokenStates: () => void;
  setTokens: (configId: string, tokens: OAuthTokens, storageType: OAuthConfig['tokenStorage']) => void;
  clearTokens: (configId: string) => void;
  clearAllTokens: () => void;
  
  // Authentication state
  setAuthenticating: (configId: string, isAuthenticating: boolean) => void;
  setError: (configId: string, error: string | null) => void;
  clearError: (configId: string) => void;
}

export const useOAuthStore = create<OAuthState>((set, get) => ({
  configs: [],
  tokenState: {},
  isLoadingConfigs: false,
  isAuthenticating: {},
  errors: {},

  // Config actions
  loadConfigs: () => loadConfigs(set, get),
  addConfig: (configData) => addConfig(set, configData),
  updateConfig: (id, updates) => updateConfig(set, id, updates),
  deleteConfig: (id) => deleteConfig(set, get, id),
  getConfig: (id) => getConfig(get, id),

  // Token management
  loadTokenState: (configId) => loadTokenState(set, get, configId),
  loadAllTokenStates: () => loadAllTokenStates(get),
  setTokens: (configId, tokens, storageType) => setTokens(get, configId, tokens, storageType),
  clearTokens: (configId) => clearTokens(set, configId),
  clearAllTokens: () => clearAllTokens(set, get),

  // Authentication state
  setAuthenticating: (configId, isAuthenticating) => setAuthenticating(set, configId, isAuthenticating),
  setError: (configId, error) => setError(set, get, configId, error),
  clearError: (configId) => clearError(set, configId),
}));
