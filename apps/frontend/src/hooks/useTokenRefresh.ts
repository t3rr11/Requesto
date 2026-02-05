/**
 * OAuth Token Refresh Hook
 * Automatically refreshes OAuth tokens before they expire
 */

import { useEffect, useRef, useCallback } from 'react';
import { useOAuthStore } from '../store/oauth';
import { refreshOAuthToken } from '../helpers/oauth/oauthFlowHandler';
import { isTokenExpiringSoon } from '../helpers/oauth/tokenManager';

interface UseTokenRefreshOptions {
  /**
   * Config ID to monitor for token refresh
   */
  configId: string;
  
  /**
   * Whether automatic refresh is enabled
   * Default: true
   */
  enabled?: boolean;
  
  /**
   * Check interval in milliseconds
   * Default: 60000 (1 minute)
   */
  checkInterval?: number;
  
  /**
   * Callback when token is successfully refreshed
   */
  onRefresh?: (configId: string) => void;
  
  /**
   * Callback when token refresh fails
   */
  onRefreshError?: (configId: string, error: Error) => void;
}

/**
 * Hook for automatic token refresh
 * 
 * Monitors token expiry and automatically refreshes tokens before they expire.
 * Uses configurable threshold from OAuth config (default 5 minutes before expiry).
 * 
 * @example
 * ```tsx
 * useTokenRefresh({
 *   configId: 'my-oauth-config',
 *   enabled: true,
 *   onRefresh: () => console.log('Token refreshed'),
 *   onRefreshError: (id, error) => console.error('Refresh failed', error),
 * });
 * ```
 */
export function useTokenRefresh({
  configId,
  enabled = true,
  checkInterval = 60000, // Check every minute
  onRefresh,
  onRefreshError,
}: UseTokenRefreshOptions) {
  const { 
    getConfig, 
    tokenState, 
    setTokens,
    setError,
  } = useOAuthStore();
  
  const isRefreshingRef = useRef(false);
  const lastRefreshAttemptRef = useRef<number>(0);
  
  /**
   * Attempt to refresh the token
   */
  const attemptRefresh = useCallback(async () => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshingRef.current) {
      return;
    }
    
    // Don't retry too quickly (minimum 30 seconds between attempts)
    const timeSinceLastAttempt = Date.now() - lastRefreshAttemptRef.current;
    if (timeSinceLastAttempt < 30000) {
      return;
    }
    
    const config = getConfig(configId);
    if (!config) {
      return;
    }
    
    const tokens = tokenState[configId]?.tokens;
    if (!tokens?.refreshToken) {
      return;
    }
    
    // Check if token is expiring soon based on config threshold
    const threshold = config.tokenRefreshThreshold || 300; // Default 5 minutes
    if (!isTokenExpiringSoon(tokens, threshold)) {
      return;
    }
    
    isRefreshingRef.current = true;
    lastRefreshAttemptRef.current = Date.now();
    
    try {
      const newTokens = await refreshOAuthToken(configId, tokens.refreshToken);
      
      // Keep existing refresh token if not provided in response
      if (!newTokens.refreshToken && tokens.refreshToken) {
        newTokens.refreshToken = tokens.refreshToken;
      }
      
      // Store tokens with same storage type as config
      setTokens(configId, newTokens, config.tokenStorage);
      setError(configId, null);
      
      // Call success callback
      onRefresh?.(configId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Token refresh failed';
      setError(configId, errorMsg);
      
      // Call error callback
      if (onRefreshError && error instanceof Error) {
        onRefreshError(configId, error);
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [configId, getConfig, tokenState, setTokens, setError, onRefresh, onRefreshError]);
  
  /**
   * Check if token needs refresh
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }
    
    const config = getConfig(configId);
    if (!config || !config.autoRefreshToken) {
      return;
    }
    
    // Initial check
    attemptRefresh();
    
    // Set up interval for periodic checks
    const intervalId = setInterval(() => {
      attemptRefresh();
    }, checkInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, configId, checkInterval, attemptRefresh, getConfig]);
  
  return {
    isRefreshing: isRefreshingRef.current,
  };
}
