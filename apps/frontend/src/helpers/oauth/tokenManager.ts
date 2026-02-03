/**
 * OAuth Token Manager
 * Handles token storage with configurable storage mechanisms (memory, sessionStorage, localStorage)
 */

import { OAuthTokens, OAuthTokenStorage } from '../../types';

// In-memory token storage (cleared on page refresh)
const memoryStorage: Record<string, OAuthTokens> = {};

/**
 * Get the storage key for a specific OAuth config
 * @param configId - The OAuth config ID
 * @returns Storage key string
 */
function getStorageKey(configId: string): string {
  return `oauth-tokens-${configId}`;
}

/**
 * Store OAuth tokens using the specified storage mechanism
 * 
 * @param configId - The OAuth config ID
 * @param tokens - The tokens to store
 * @param storageType - Where to store tokens ('memory', 'session', 'local')
 */
export function storeTokens(
  configId: string,
  tokens: OAuthTokens,
  storageType: OAuthTokenStorage = 'session'
): void {
  const key = getStorageKey(configId);
  
  // Calculate expiry timestamp if expiresIn is provided
  const tokensWithExpiry: OAuthTokens = {
    ...tokens,
    expiresAt: tokens.expiresIn 
      ? Date.now() + (tokens.expiresIn * 1000)
      : tokens.expiresAt,
  };

  try {
    switch (storageType) {
      case 'memory':
        memoryStorage[key] = tokensWithExpiry;
        break;
      
      case 'session':
        sessionStorage.setItem(key, JSON.stringify(tokensWithExpiry));
        break;
      
      case 'local':
        localStorage.setItem(key, JSON.stringify(tokensWithExpiry));
        break;
      
      default:
        throw new Error(`Unknown storage type: ${storageType}`);
    }
  } catch (error) {
    console.error('[OAuth] Failed to store tokens:', error);
    throw new Error('Failed to store OAuth tokens');
  }
}

/**
 * Retrieve OAuth tokens from storage
 * Checks all storage mechanisms in order: memory -> sessionStorage -> localStorage
 * 
 * @param configId - The OAuth config ID
 * @returns The stored tokens, or null if not found
 */
export function getTokens(configId: string): OAuthTokens | null {
  const key = getStorageKey(configId);

  try {
    // Check memory first
    if (memoryStorage[key]) {
      return memoryStorage[key];
    }

    // Check sessionStorage
    const sessionData = sessionStorage.getItem(key);
    if (sessionData) {
      return JSON.parse(sessionData);
    }

    // Check localStorage
    const localData = localStorage.getItem(key);
    if (localData) {
      return JSON.parse(localData);
    }

    return null;
  } catch (error) {
    console.error('Failed to retrieve OAuth tokens:', error);
    return null;
  }
}

/**
 * Remove OAuth tokens from all storage mechanisms
 * 
 * @param configId - The OAuth config ID
 */
export function removeTokens(configId: string): void {
  const key = getStorageKey(configId);

  try {
    // Clear from all storage types
    delete memoryStorage[key];
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('[OAuth] Failed to remove tokens:', error);
  }
}

/**
 * Check if tokens exist for a config
 * 
 * @param configId - The OAuth config ID
 * @returns True if tokens exist
 */
export function hasTokens(configId: string): boolean {
  return getTokens(configId) !== null;
}

/**
 * Check if the access token is expired or about to expire
 * 
 * @param tokens - The tokens to check
 * @param thresholdSeconds - Consider expired if within this many seconds of expiry (default: 60)
 * @returns True if expired or about to expire
 */
export function isTokenExpired(tokens: OAuthTokens | null, thresholdSeconds: number = 60): boolean {
  if (!tokens || !tokens.expiresAt) {
    return true; // No tokens or no expiry info
  }

  const now = Date.now();
  const expiryWithThreshold = tokens.expiresAt - (thresholdSeconds * 1000);

  return now >= expiryWithThreshold;
}

/**
 * Get time until token expires (in seconds)
 * 
 * @param tokens - The tokens to check
 * @returns Seconds until expiry, or null if no expiry info
 */
export function getTimeUntilExpiry(tokens: OAuthTokens | null): number | null {
  if (!tokens || !tokens.expiresAt) {
    return null;
  }

  const now = Date.now();
  const remaining = Math.max(0, tokens.expiresAt - now);

  return Math.floor(remaining / 1000);
}

/**
 * Format time until token expiry for display
 * 
 * @param tokens - The tokens to check
 * @returns Human-readable expiry string
 */
export function formatTimeUntilExpiry(tokens: OAuthTokens | null): string {
  const seconds = getTimeUntilExpiry(tokens);

  if (seconds === null) {
    return 'Unknown';
  }

  if (seconds <= 0) {
    return 'Expired';
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Update tokens in storage (e.g., after refresh)
 * Preserves the storage type from the original tokens
 * 
 * @param configId - The OAuth config ID
 * @param newTokens - The new tokens
 * @param storageType - Storage type to use
 */
export function updateTokens(
  configId: string,
  newTokens: Partial<OAuthTokens>,
  storageType: OAuthTokenStorage = 'session'
): void {
  const existingTokens = getTokens(configId);

  if (!existingTokens) {
    throw new Error('Cannot update tokens: no existing tokens found');
  }

  const updatedTokens: OAuthTokens = {
    ...existingTokens,
    ...newTokens,
  };

  storeTokens(configId, updatedTokens, storageType);
}

/**
 * Clear all OAuth tokens from all storage mechanisms
 * Useful for global logout or cleanup
 */
export function clearAllTokens(): void {
  try {
    // Clear memory storage
    for (const key in memoryStorage) {
      delete memoryStorage[key];
    }

    // Clear from sessionStorage
    const sessionKeys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('oauth-tokens-')) {
        sessionKeys.push(key);
      }
    }
    sessionKeys.forEach(key => sessionStorage.removeItem(key));

    // Clear from localStorage
    const localKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('oauth-tokens-')) {
        localKeys.push(key);
      }
    }
    localKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('[OAuth] Failed to clear all tokens:', error);
  }
}

/**
 * Get all stored token config IDs
 * @returns Array of config IDs that have tokens stored
 */
export function getAllTokenConfigIds(): string[] {
  const configIds = new Set<string>();

  try {
    // Check memory
    Object.keys(memoryStorage).forEach(key => {
      if (key.startsWith('oauth-tokens-')) {
        configIds.add(key.replace('oauth-tokens-', ''));
      }
    });

    // Check sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('oauth-tokens-')) {
        configIds.add(key.replace('oauth-tokens-', ''));
      }
    }

    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('oauth-tokens-')) {
        configIds.add(key.replace('oauth-tokens-', ''));
      }
    }

    return Array.from(configIds);
  } catch (error) {
    console.error('Failed to get token config IDs:', error);
    return [];
  }
}

/**
 * Get the Bearer token header value
 * @param tokens - The OAuth tokens
 * @returns Authorization header value (e.g., "Bearer eyJ...")
 */
export function getBearerToken(tokens: OAuthTokens | null): string | null {
  if (!tokens || !tokens.accessToken) {
    return null;
  }

  return `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}`;
}

/**
 * Generate Authorization header value from access token
 * @param accessToken - The access token  
 * @returns Authorization header value (e.g., "Bearer eyJ...")
 */
export function generateAuthorizationHeader(accessToken: string, tokenType: string = 'Bearer'): string {
  return `${tokenType} ${accessToken}`;
}
