/**
 * OAuth Store
 * Manages OAuth configurations and token state
 */

import { create } from 'zustand';
import { OAuthConfig, OAuthTokens } from '../types';
import { getTokens, storeTokens, removeTokens, isTokenExpired } from '../helpers/oauth/tokenManager';

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

  // Load OAuth configurations from backend
  loadConfigs: async () => {
    set({ isLoadingConfigs: true });
    try {
      const response = await fetch('/api/oauth/configs');
      if (!response.ok) {
        throw new Error('Failed to load OAuth configurations');
      }
      
      const configs: OAuthConfig[] = await response.json();
      set({ configs });
      
      // Load token states for all configs
      get().loadAllTokenStates();
    } catch (error) {
      console.error('[OAuth Store] Failed to load OAuth configs:', error);
      throw error;
    } finally {
      set({ isLoadingConfigs: false });
    }
  },

  // Add new OAuth configuration
  addConfig: async (configData) => {
    try {
      const response = await fetch('/api/oauth/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create OAuth configuration');
      }
      
      const newConfig: OAuthConfig = await response.json();
      
      set(state => ({
        configs: [...state.configs, newConfig],
      }));
      
      return newConfig;
    } catch (error) {
      console.error('Failed to add OAuth config:', error);
      throw error;
    }
  },

  // Update existing OAuth configuration
  updateConfig: async (id, updates) => {
    try {
      const response = await fetch(`/api/oauth/configs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update OAuth configuration');
      }
      
      const updatedConfig: OAuthConfig = await response.json();
      
      set(state => ({
        configs: state.configs.map(c => c.id === id ? updatedConfig : c),
      }));
    } catch (error) {
      console.error('Failed to update OAuth config:', error);
      throw error;
    }
  },

  // Delete OAuth configuration
  deleteConfig: async (id) => {
    try {
      const response = await fetch(`/api/oauth/configs/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete OAuth configuration');
      }
      
      set(state => ({
        configs: state.configs.filter(c => c.id !== id),
      }));
      
      // Clear associated tokens
      get().clearTokens(id);
    } catch (error) {
      console.error('Failed to delete OAuth config:', error);
      throw error;
    }
  },

  // Get config by ID
  getConfig: (id) => {
    const config = get().configs.find(c => c.id === id) || null;
    console.log('[OAuth Store] getConfig:', id.substring(0, 10) + '...', config ? 'FOUND' : 'NOT FOUND');
    if (!config) {
      console.log('[OAuth Store] Available configs:', get().configs.map(c => c.id.substring(0, 10) + '...'));
    }
    return config;
  },

  // Load token state for a specific config
  loadTokenState: (configId) => {
    const tokens = getTokens(configId);
    const isExpired = isTokenExpired(tokens);
    const expiresIn = tokens?.expiresAt 
      ? Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 1000))
      : null;
    
    set(state => ({
      tokenState: {
        ...state.tokenState,
        [configId]: { tokens, isExpired, expiresIn },
      },
    }));
  },

  // Load token states for all configs
  loadAllTokenStates: () => {
    const { configs } = get();
    configs.forEach(config => {
      get().loadTokenState(config.id);
    });
  },

  // Store tokens
  setTokens: (configId, tokens, storageType) => {
    storeTokens(configId, tokens, storageType);
    get().loadTokenState(configId);
  },

  // Clear tokens for a config
  clearTokens: (configId) => {
    removeTokens(configId);
    set(state => ({
      tokenState: {
        ...state.tokenState,
        [configId]: { tokens: null, isExpired: true, expiresIn: null },
      },
    }));
  },

  // Clear all tokens
  clearAllTokens: () => {
    const { configs } = get();
    configs.forEach(config => {
      removeTokens(config.id);
    });
    set({ tokenState: {} });
  },

  // Set authenticating state
  setAuthenticating: (configId, isAuthenticating) => {
    set(state => ({
      isAuthenticating: {
        ...state.isAuthenticating,
        [configId]: isAuthenticating,
      },
    }));
  },

  // Set error
  setError: (configId, error) => {
    if (error) {
      set(state => ({
        errors: {
          ...state.errors,
          [configId]: error,
        },
      }));
    } else {
      get().clearError(configId);
    }
  },

  // Clear error
  clearError: (configId) => {
    set(state => {
      const { [configId]: _, ...rest } = state.errors;
      return { errors: rest };
    });
  },
}));
