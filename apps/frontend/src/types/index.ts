export interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}

// Tab-related types for tabs feature

/**
 * Represents the request state within a tab
 */
export interface TabRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Represents a single request tab session
 */
export interface Tab {
  id: string; // Unique tab identifier
  label: string; // Display name (e.g., "GET users" or "New Request")
  request: TabRequest; // Current request configuration
  response: ProxyResponse | null; // Last response for this tab
  isDirty: boolean; // Has unsaved changes vs saved collection
  isLoading: boolean; // Is this tab's request currently in-flight
  error: string | null; // Last error for this tab
  
  // Collection linking
  savedRequestId?: string; // Linked collection request ID
  collectionId?: string; // Parent collection ID
  
  // Original saved state for dirty detection
  originalRequest?: TabRequest;
  
  // Metadata
  createdAt: number;
  lastAccessedAt: number;
}
