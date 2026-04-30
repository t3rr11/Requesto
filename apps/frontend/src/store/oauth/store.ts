import { create } from 'zustand';
import type { OAuthConfig, OAuthTokenStatus } from './types';
import * as actions from './actions';

type OAuthStoreState = {
  configs: OAuthConfig[];
  tokenStatuses: Record<string, OAuthTokenStatus>;
  isLoadingConfigs: boolean;
  isAuthenticating: Record<string, boolean>;
  errors: Record<string, string>;

  loadConfigs: () => Promise<void>;
  addConfig: (config: Omit<OAuthConfig, 'id'>) => Promise<OAuthConfig>;
  updateConfig: (id: string, updates: Partial<OAuthConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  getConfig: (id: string) => OAuthConfig | null;

  loadTokenStatus: (configId: string) => Promise<void>;
  clearTokens: (configId: string) => Promise<void>;

  setAuthenticating: (configId: string, isAuthenticating: boolean) => void;
  setError: (configId: string, error: string | null) => void;
  clearError: (configId: string) => void;
};

export const useOAuthStore = create<OAuthStoreState>((set, get) => ({
  configs: [],
  tokenStatuses: {},
  isLoadingConfigs: false,
  isAuthenticating: {},
  errors: {},

  loadConfigs: () => actions.loadConfigs(set, get),
  addConfig: (configData) => actions.addConfig(set, configData),
  updateConfig: (id, updates) => actions.updateConfig(set, id, updates),
  deleteConfig: (id) => actions.deleteConfig(set, get, id),
  getConfig: (id) => actions.getConfig(get, id),

  loadTokenStatus: (configId) => actions.loadTokenStatus(set, configId),
  clearTokens: (configId) => actions.clearTokens(set, configId),

  setAuthenticating: (configId, isAuth) => actions.setAuthenticating(set, configId, isAuth),
  setError: (configId, error) => actions.setError(set, configId, error),
  clearError: (configId) => actions.clearError(set, configId),
}));
