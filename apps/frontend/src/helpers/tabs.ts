import type { Tab, TabRequest } from '../store/tabs/types';

/**
 * Deep-compare two tab requests for equality (dirty detection).
 * Normalises missing auth to `{ type: 'none' }` so switching back to "None"
 * doesn't leave the tab permanently dirty.
 */
export function areRequestsEqual(a: TabRequest, b: TabRequest): boolean {
  if (a.method !== b.method) return false;
  if (a.url !== b.url) return false;
  if (JSON.stringify(a.headers || {}) !== JSON.stringify(b.headers || {})) return false;
  if ((a.body || '') !== (b.body || '')) return false;

  const normaliseAuth = (auth: TabRequest['auth']) => {
    if (!auth || auth.type === 'none') return JSON.stringify({ type: 'none' });
    return JSON.stringify(auth);
  };
  return normaliseAuth(a.auth) === normaliseAuth(b.auth);
}

/**
 * Single source of truth for tab dirty detection.
 * Used by both the tabs store and any UI that needs to know dirty state.
 */
export function isTabDirty(tab: Tab): boolean {
  if (!tab.savedRequestId) {
    return tab.request.url.trim().length > 0;
  }
  if (!tab.originalRequest) return false;
  return !areRequestsEqual(tab.request, tab.originalRequest);
}

/**
 * Generate a display label from request data.
 */
export function generateTabLabel(request: TabRequest, name?: string): string {
  if (name) return name;
  if (!request.url) return 'New Request';

  try {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean).pop() || url.hostname;
    return `${request.method} ${path}`;
  } catch {
    const part = request.url.split('/').filter(Boolean)[0] || 'request';
    return `${request.method} ${part.substring(0, 20)}`;
  }
}

export function savedRequestToTabRequest(saved: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  auth?: TabRequest['auth'];
}): TabRequest {
  return {
    method: saved.method,
    url: saved.url,
    headers: saved.headers,
    body: saved.body,
    auth: saved.auth,
  };
}

export function cloneTabRequest(request: TabRequest): TabRequest {
  return {
    method: request.method,
    url: request.url,
    headers: request.headers ? { ...request.headers } : undefined,
    body: request.body,
    auth: request.auth ? JSON.parse(JSON.stringify(request.auth)) : undefined,
  };
}

export function sortTabsByRecentlyUsed(tabs: Tab[]): Tab[] {
  return [...tabs].sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
}
