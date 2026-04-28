import { useState, useCallback } from 'react';
import type { OAuthConfig } from '../store/oauth/types';
import { startOAuthFlow, refreshOAuthToken } from '../helpers/oauth/oauthFlowHandler';
import { useOAuthStore } from '../store/oauth/store';

export type UseOAuthFlowResult = {
  isAuthenticating: boolean;
  error: string | null;
  authenticate: (config: OAuthConfig) => Promise<void>;
  refresh: (configId: string) => Promise<void>;
  clearError: () => void;
};

export function useOAuthFlow(configId?: string): UseOAuthFlowResult {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    loadTokenStatus,
    setAuthenticating: setStoreAuthenticating,
    setError: setStoreError,
  } = useOAuthStore();

  const authenticate = useCallback(async (config: OAuthConfig) => {
    setIsAuthenticating(true);
    setError(null);
    setStoreAuthenticating(config.id, true);
    setStoreError(config.id, null);

    try {
      const result = await startOAuthFlow(config);

      if (result.success) {
        // Backend persisted the tokens; refresh non-secret status for display.
        await loadTokenStatus(config.id);
      } else if (result.error === 'redirect_in_progress') {
        // Full redirect initiated — will be resolved after redirect back.
        return;
      } else {
        const errorMsg = result.errorDescription || result.error || 'Authentication failed';
        setError(errorMsg);
        setStoreError(config.id, errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMsg);
      setStoreError(config.id, errorMsg);
    } finally {
      setIsAuthenticating(false);
      setStoreAuthenticating(config.id, false);
    }
  }, [loadTokenStatus, setStoreAuthenticating, setStoreError]);

  const refresh = useCallback(async (targetConfigId: string) => {
    setIsAuthenticating(true);
    setError(null);
    setStoreAuthenticating(targetConfigId, true);
    setStoreError(targetConfigId, null);

    try {
      await refreshOAuthToken(targetConfigId);
      await loadTokenStatus(targetConfigId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Token refresh failed';
      setError(errorMsg);
      setStoreError(targetConfigId, errorMsg);
      throw err;
    } finally {
      setIsAuthenticating(false);
      setStoreAuthenticating(targetConfigId, false);
    }
  }, [loadTokenStatus, setStoreAuthenticating, setStoreError]);

  const clearError = useCallback(() => {
    setError(null);
    if (configId) {
      setStoreError(configId, null);
    }
  }, [configId, setStoreError]);

  return { isAuthenticating, error, authenticate, refresh, clearError };
}
