/**
 * OAuth State Management Helpers
 * Handles CSRF protection via state parameter and OIDC nonce
 */

import { OAuthState } from '../../types';

const STATE_STORAGE_KEY = 'oauth-flow-states';
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Use localStorage instead of sessionStorage because popup windows don't share sessionStorage
// with their opener, but they do share localStorage (same origin)

/**
 * Generate a cryptographically random state parameter
 * Used for CSRF protection in OAuth flows
 * 
 * @returns Random base64url-encoded string
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate a cryptographically random nonce
 * Used for replay protection in OpenID Connect
 * 
 * @returns Random base64url-encoded string
 */
export function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Store OAuth flow state in sessionStorage (alias for storeOAuthState)
 * Used to validate callback and retrieve flow context
 * 
 * @param oauthState - The OAuth state to store
 */
export function saveState(oauthState: OAuthState): void {
  storeOAuthState(oauthState);
}

/**
 * Store OAuth flow state in sessionStorage
 * Used to validate callback and retrieve flow context
 * 
 * @param oauthState - The OAuth state to store
 */
export function storeOAuthState(oauthState: OAuthState): void {
  try {
    const states = getAllStoredStates();
    
    // Add new state
    states[oauthState.state] = oauthState;
    
    // Clean up expired states
    cleanupExpiredStates(states);
    
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Failed to store OAuth state:', error);
    throw new Error('Failed to store OAuth state');
  }
}

/**
 * Retrieve and validate OAuth flow state from sessionStorage
 * Returns the state and removes it from storage (one-time use)
 * 
 * @param state - The state parameter from OAuth callback
 * @returns The stored OAuth state, or null if not found/invalid
 */
export function retrieveOAuthState(state: string): OAuthState | null {
  try {
    const states = getAllStoredStates();
    
    const oauthState = states[state];
    
    if (!oauthState) {
      console.error('[OAuth] State not found in storage');
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    const age = now - oauthState.timestamp;
    
    if (age > STATE_EXPIRY_MS) {
      console.warn('[OAuth] State expired');
      delete states[state];
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(states));
      return null;
    }
    
    // Remove state from storage (one-time use)
    delete states[state];
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(states));
    
    return oauthState;
  } catch (error) {
    console.error('Failed to retrieve OAuth state:', error);
    return null;
  }
}

/**
 * Clear all stored OAuth states
 * Useful for cleanup or logout
 */
export function clearAllOAuthStates(): void {
  try {
    localStorage.removeItem(STATE_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear OAuth states:', error);
  }
}

/**
 * Get all stored OAuth states
 * @returns Object mapping state strings to OAuthState objects
 */
function getAllStoredStates(): Record<string, OAuthState> {
  try {
    const stored = localStorage.getItem(STATE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to parse stored OAuth states:', error);
    return {};
  }
}

/**
 * Remove expired states from storage
 * @param states - Current states object (mutated in-place)
 */
function cleanupExpiredStates(states: Record<string, OAuthState>): void {
  const now = Date.now();
  const expiredStates = Object.keys(states).filter(
    key => now - states[key].timestamp > STATE_EXPIRY_MS
  );
  
  expiredStates.forEach(key => delete states[key]);
}

/**
 * Convert Uint8Array to base64url encoding
 * @param buffer - The buffer to encode
 * @returns Base64URL-encoded string
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validate state parameter format
 * Should be a non-empty string
 * 
 * @param state - The state to validate
 * @returns True if valid
 */
export function isValidState(state: string | null | undefined): boolean {
  return typeof state === 'string' && state.length > 0;
}
