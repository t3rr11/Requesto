/**
 * OAuth Flow Hook
 * Custom hook for managing OAuth authentication flow
 */

import { useState, useCallback } from 'react';
import { OAuthConfig } from '../types';
import { startOAuthFlow, refreshOAuthToken } from '../helpers/oauth/oauthFlowHandler';
import { useOAuthStore } from '../store/useOAuthStore';

export interface UseOAuthFlowResult {
  isAuthenticating: boolean;
  error: string | null;
  authenticate: (config: OAuthConfig) => Promise<void>;
  refresh: (configId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing OAuth flow
 */
export function useOAuthFlow(configId?: string): UseOAuthFlowResult {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    getConfig, 
    setTokens, 
    tokenState,
    setAuthenticating: setStoreAuthenticating,
    setError: setStoreError,
  } = useOAuthStore();

  /**
   * Start OAuth authentication flow
   */
  const authenticate = useCallback(async (config: OAuthConfig) => {
    setIsAuthenticating(true);
    setError(null);
    setStoreAuthenticating(config.id, true);
    setStoreError(config.id, null);
    
    try {
      const result = await startOAuthFlow(config);
      
      if (result.success && result.tokens) {
        // Store tokens using the config's storage preference
        setTokens(config.id, result.tokens, config.tokenStorage);
        setIsAuthenticating(false);
        setStoreAuthenticating(config.id, false);
      } else if (result.error === 'redirect_in_progress') {
        // Full redirect initiated, keep authenticating state
        // (will be resolved after redirect back)
      } else {
        // Authentication failed
        const errorMsg = result.errorDescription || result.error || 'Authentication failed';
        setError(errorMsg);
        setStoreError(config.id, errorMsg);
        setIsAuthenticating(false);
        setStoreAuthenticating(config.id, false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMsg);
      setStoreError(config.id, errorMsg);
      setIsAuthenticating(false);
      setStoreAuthenticating(config.id, false);
    }
  }, [setTokens, setStoreAuthenticating, setStoreError]);

  /**
   * Refresh access token using refresh token
   */
  const refresh = useCallback(async (targetConfigId: string) => {
    const config = getConfig(targetConfigId);
    if (!config) {
      setError('OAuth configuration not found');
      return;
    }
    
    const tokens = tokenState[targetConfigId]?.tokens;
    if (!tokens?.refreshToken) {
      setError('No refresh token available');
      return;
    }
    
    setIsAuthenticating(true);
    setError(null);
    setStoreAuthenticating(targetConfigId, true);
    setStoreError(targetConfigId, null);
    
    try {
      const newTokens = await refreshOAuthToken(targetConfigId, tokens.refreshToken);
      
      // Keep existing refresh token if not provided in response
      if (!newTokens.refreshToken && tokens.refreshToken) {
        newTokens.refreshToken = tokens.refreshToken;
      }
      
      setTokens(targetConfigId, newTokens, config.tokenStorage);
      setIsAuthenticating(false);
      setStoreAuthenticating(targetConfigId, false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Token refresh failed';
      setError(errorMsg);
      setStoreError(targetConfigId, errorMsg);
      setIsAuthenticating(false);
      setStoreAuthenticating(targetConfigId, false);
      throw err;
    }
  }, [getConfig, tokenState, setTokens, setStoreAuthenticating, setStoreError]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    if (configId) {
      setStoreError(configId, null);
    }
  }, [configId, setStoreError]);

  return {
    isAuthenticating,
    error,
    authenticate,
    refresh,
    clearError,
  };
}
