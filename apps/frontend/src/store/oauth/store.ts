import { create } from 'zustand';
import type { OAuthConfig, OAuthTokens } from './types';
import * as actions from './actions';

type TokenStateEntry = {
  tokens: OAuthTokens | null;
  isExpired: boolean;
  expiresIn: number | null;
};

type OAuthStoreState = {
  configs: OAuthConfig[];
  tokenState: Record<string, TokenStateEntry>;
  isLoadingConfigs: boolean;
  isAuthenticating: Record<string, boolean>;
  errors: Record<string, string>;

  loadConfigs: () => Promise<void>;
  addConfig: (config: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<OAuthConfig>;
  updateConfig: (id: string, updates: Partial<OAuthConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  getConfig: (id: string) => OAuthConfig | null;

  loadTokenState: (configId: string) => void;
  loadAllTokenStates: () => void;
  setTokens: (configId: string, tokens: OAuthTokens, storageType: OAuthConfig['tokenStorage']) => void;
  clearTokens: (configId: string) => void;
  clearAllTokens: () => void;

  setAuthenticating: (configId: string, isAuthenticating: boolean) => void;
  setError: (configId: string, error: string | null) => void;
  clearError: (configId: string) => void;
};

export const useOAuthStore = create<OAuthStoreState>((set, get) => ({
  configs: [],
  tokenState: {},
  isLoadingConfigs: false,
  isAuthenticating: {},
  errors: {},

  loadConfigs: () => actions.loadConfigs(set, get),
  addConfig: (configData) => actions.addConfig(set, configData),
  updateConfig: (id, updates) => actions.updateConfig(set, id, updates),
  deleteConfig: (id) => actions.deleteConfig(set, get, id),
  getConfig: (id) => actions.getConfig(get, id),

  loadTokenState: (configId) => actions.loadTokenState(set, configId),
  loadAllTokenStates: () => actions.loadAllTokenStates(get),
  setTokens: (configId, tokens, storageType) => actions.setTokens(get, configId, tokens, storageType),
  clearTokens: (configId) => actions.clearTokens(set, configId),
  clearAllTokens: () => actions.clearAllTokens(set, get),

  setAuthenticating: (configId, isAuth) => actions.setAuthenticating(set, configId, isAuth),
  setError: (configId, error) => actions.setError(set, configId, error),
  clearError: (configId) => actions.clearError(set, configId),
}));
