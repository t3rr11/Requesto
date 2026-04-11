import type { OAuthTokens, OAuthTokenStorage } from '../../store/oauth/types';

const memoryStorage: Record<string, OAuthTokens> = {};

function getStorageKey(configId: string): string {
  return `oauth-tokens-${configId}`;
}

export function storeTokens(configId: string, tokens: OAuthTokens, storageType: OAuthTokenStorage = 'session'): void {
  const key = getStorageKey(configId);
  const withExpiry: OAuthTokens = {
    ...tokens,
    expiresAt: tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : tokens.expiresAt,
  };

  switch (storageType) {
    case 'memory': memoryStorage[key] = withExpiry; break;
    case 'session': sessionStorage.setItem(key, JSON.stringify(withExpiry)); break;
    case 'local': localStorage.setItem(key, JSON.stringify(withExpiry)); break;
  }
}

export function getTokens(configId: string): OAuthTokens | null {
  const key = getStorageKey(configId);
  try {
    if (memoryStorage[key]) return memoryStorage[key];
    const session = sessionStorage.getItem(key);
    if (session) return JSON.parse(session);
    const local = localStorage.getItem(key);
    if (local) return JSON.parse(local);
    return null;
  } catch {
    return null;
  }
}

export function removeTokens(configId: string): void {
  const key = getStorageKey(configId);
  delete memoryStorage[key];
  try { sessionStorage.removeItem(key); } catch { /* noop */ }
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

export function hasTokens(configId: string): boolean {
  return getTokens(configId) !== null;
}

export function isTokenExpired(tokens: OAuthTokens | null, thresholdSeconds = 60): boolean {
  if (!tokens?.expiresAt) return true;
  return Date.now() >= tokens.expiresAt - thresholdSeconds * 1000;
}

export function isTokenExpiringSoon(tokens: OAuthTokens | null, thresholdSeconds = 300): boolean {
  if (!tokens?.expiresAt) return false;
  return Date.now() >= tokens.expiresAt - thresholdSeconds * 1000;
}

export function getTimeUntilExpiry(tokens: OAuthTokens | null): number | null {
  if (!tokens?.expiresAt) return null;
  return Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 1000));
}

export function formatTimeUntilExpiry(tokens: OAuthTokens | null): string {
  const seconds = getTimeUntilExpiry(tokens);
  if (seconds === null) return 'Unknown';
  if (seconds <= 0) return 'Expired';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function updateTokens(configId: string, partial: Partial<OAuthTokens>, storageType: OAuthTokenStorage = 'session'): void {
  const existing = getTokens(configId);
  if (!existing) throw new Error('Cannot update tokens: no existing tokens found');
  storeTokens(configId, { ...existing, ...partial }, storageType);
}

export function clearAllTokens(): void {
  for (const key in memoryStorage) delete memoryStorage[key];
  const removeOAuthKeys = (storage: Storage) => {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith('oauth-tokens-')) keys.push(k);
    }
    keys.forEach((k) => storage.removeItem(k));
  };
  try { removeOAuthKeys(sessionStorage); } catch { /* noop */ }
  try { removeOAuthKeys(localStorage); } catch { /* noop */ }
}

export function getAllTokenConfigIds(): string[] {
  const ids = new Set<string>();
  const prefix = 'oauth-tokens-';
  Object.keys(memoryStorage).forEach((k) => { if (k.startsWith(prefix)) ids.add(k.replace(prefix, '')); });
  const scan = (storage: Storage) => {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(prefix)) ids.add(k.replace(prefix, ''));
    }
  };
  try { scan(sessionStorage); } catch { /* noop */ }
  try { scan(localStorage); } catch { /* noop */ }
  return Array.from(ids);
}

export function getBearerToken(tokens: OAuthTokens | null): string | null {
  if (!tokens?.accessToken) return null;
  return `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}`;
}

export function generateAuthorizationHeader(accessToken: string, tokenType = 'Bearer'): string {
  return `${tokenType} ${accessToken}`;
}
