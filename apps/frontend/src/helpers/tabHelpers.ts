import { Tab, TabRequest } from '../types';

/**
 * Compare two tab requests for equality (for dirty detection)
 */
export const areRequestsEqual = (req1: TabRequest, req2: TabRequest): boolean => {
  return (
    req1.method === req2.method &&
    req1.url === req2.url &&
    JSON.stringify(req1.headers || {}) === JSON.stringify(req2.headers || {}) &&
    (req1.body || '') === (req2.body || '')
  );
};

/**
 * Generate a tab label from request data
 */
export const generateTabLabel = (request: TabRequest, name?: string): string => {
  if (name) return name;
  
  if (!request.url) return 'New Request';
  
  try {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean).pop() || url.hostname;
    return `${request.method} ${path}`;
  } catch {
    // If URL is invalid, use method + first part of URL
    const urlPart = request.url.split('/').filter(Boolean)[0] || 'request';
    return `${request.method} ${urlPart.substring(0, 20)}`;
  }
};

/**
 * Convert saved request to TabRequest format
 */
export const savedRequestToTabRequest = (savedRequest: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}): TabRequest => {
  return {
    method: savedRequest.method,
    url: savedRequest.url,
    headers: savedRequest.headers,
    body: savedRequest.body,
  };
};

/**
 * Create a deep clone of a tab request
 */
export const cloneTabRequest = (request: TabRequest): TabRequest => {
  return {
    method: request.method,
    url: request.url,
    headers: request.headers ? { ...request.headers } : undefined,
    body: request.body,
  };
};

/**
 * Check if a tab has unsaved changes
 */
export const isTabDirty = (tab: Tab): boolean => {
  if (!tab.savedRequestId) {
    // New unsaved tab is dirty if it has content
    return tab.request.url.trim().length > 0;
  }
  
  if (!tab.originalRequest) {
    return false;
  }
  
  return !areRequestsEqual(tab.request, tab.originalRequest);
};

/**
 * Get HTTP method color for UI
 */
export const getMethodColor = (method: string): string => {
  const colors: Record<string, string> = {
    GET: 'text-green-600',
    POST: 'text-blue-600',
    PUT: 'text-orange-600',
    PATCH: 'text-yellow-600',
    DELETE: 'text-red-600',
    HEAD: 'text-purple-600',
    OPTIONS: 'text-gray-600',
  };
  return colors[method.toUpperCase()] || 'text-gray-600';
};

/**
 * Sort tabs by last accessed time for "recently used" features
 */
export const sortTabsByRecentlyUsed = (tabs: Tab[]): Tab[] => {
  return [...tabs].sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
};
