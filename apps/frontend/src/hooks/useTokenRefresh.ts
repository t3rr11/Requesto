import { useEffect, useRef, useCallback } from 'react';
import { useOAuthStore } from '../store/oauth/store';
import { refreshOAuthToken } from '../helpers/oauth/oauthFlowHandler';
import { isTokenExpiringSoon } from '../helpers/oauth/tokenManager';

type UseTokenRefreshOptions = {
  configId: string;
  enabled?: boolean;
  checkInterval?: number;
  onRefresh?: (configId: string) => void;
  onRefreshError?: (configId: string, error: Error) => void;
};

export function useTokenRefresh({
  configId,
  enabled = true,
  checkInterval = 60000,
  onRefresh,
  onRefreshError,
}: UseTokenRefreshOptions) {
  const { getConfig, tokenState, setTokens, setError } = useOAuthStore();
  const isRefreshingRef = useRef(false);
  const lastRefreshAttemptRef = useRef<number>(0);

  const attemptRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    const timeSinceLastAttempt = Date.now() - lastRefreshAttemptRef.current;
    if (timeSinceLastAttempt < 30000) return;

    const config = getConfig(configId);
    if (!config) return;

    const tokens = tokenState[configId]?.tokens;
    if (!tokens?.refreshToken) return;

    const threshold = config.tokenRefreshThreshold || 300;
    if (!isTokenExpiringSoon(tokens, threshold)) return;

    isRefreshingRef.current = true;
    lastRefreshAttemptRef.current = Date.now();

    try {
      const newTokens = await refreshOAuthToken(configId, tokens.refreshToken);

      if (!newTokens.refreshToken && tokens.refreshToken) {
        newTokens.refreshToken = tokens.refreshToken;
      }

      setTokens(configId, newTokens, config.tokenStorage);
      setError(configId, null);
      onRefresh?.(configId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Token refresh failed';
      setError(configId, errorMsg);

      if (onRefreshError && error instanceof Error) {
        onRefreshError(configId, error);
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [configId, getConfig, tokenState, setTokens, setError, onRefresh, onRefreshError]);

  useEffect(() => {
    if (!enabled) return;

    const config = getConfig(configId);
    if (!config?.autoRefreshToken) return;

    attemptRefresh();

    const intervalId = setInterval(attemptRefresh, checkInterval);
    return () => clearInterval(intervalId);
  }, [enabled, configId, checkInterval, attemptRefresh, getConfig]);

  return { isRefreshing: isRefreshingRef.current };
}
