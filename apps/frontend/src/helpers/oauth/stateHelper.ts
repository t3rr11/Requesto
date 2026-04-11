import type { OAuthState } from '../../store/oauth/types';

const STATE_STORAGE_KEY = 'oauth-flow-states';
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function base64UrlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function getAllStored(): Record<string, OAuthState> {
  try {
    const raw = localStorage.getItem(STATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function cleanupExpired(states: Record<string, OAuthState>): void {
  const now = Date.now();
  for (const key of Object.keys(states)) {
    if (now - states[key].timestamp > STATE_EXPIRY_MS) delete states[key];
  }
}

export function saveState(oauthState: OAuthState): void {
  storeOAuthState(oauthState);
}

export function storeOAuthState(oauthState: OAuthState): void {
  const states = getAllStored();
  states[oauthState.state] = oauthState;
  cleanupExpired(states);
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(states));
}

export function retrieveOAuthState(state: string): OAuthState | null {
  const states = getAllStored();
  const entry = states[state];
  if (!entry) return null;

  if (Date.now() - entry.timestamp > STATE_EXPIRY_MS) {
    delete states[state];
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(states));
    return null;
  }

  delete states[state];
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(states));
  return entry;
}

export function clearAllOAuthStates(): void {
  try { localStorage.removeItem(STATE_STORAGE_KEY); } catch { /* noop */ }
}

export function isValidState(state: string | null | undefined): boolean {
  return typeof state === 'string' && state.length > 0;
}
