import { Tab, TabRequest, ProxyResponse, StreamingResponse, HistoryItem } from '../../types';
import { API_BASE } from '../../helpers/api/config';

type SetState = (partial: any) => void;
type GetState = () => any;

let tabCounter = 0;

const createNewTab = (overrides?: Partial<Tab>): Tab => {
  tabCounter++;
  const now = Date.now();
  
  return {
    id: `tab-${now}-${tabCounter}`,
    label: 'New Request',
    request: {
      method: 'GET',
      url: '',
    },
    response: null,
    isDirty: false,
    isLoading: false,
    error: null,
    createdAt: now,
    lastAccessedAt: now,
    ...overrides,
  };
};

const calculateDirtyState = (tab: Tab): boolean => {
  // New unsaved tabs are dirty if they have a URL
  if (!tab.savedRequestId) {
    return tab.request.url.trim().length > 0;
  }
  
  // Saved tabs are dirty if they differ from original
  if (!tab.originalRequest) {
    return false;
  }
  
  // Normalize auth to prevent false positives from undefined vs { type: 'none' }
  const normalizeAuth = (auth: any) => auth || { type: 'none' };
  
  const current = JSON.stringify({
    method: tab.request.method,
    url: tab.request.url,
    headers: tab.request.headers || {},
    body: tab.request.body || '',
    auth: normalizeAuth((tab.request as any).auth),
  });
  
  const original = JSON.stringify({
    method: tab.originalRequest.method,
    url: tab.originalRequest.url,
    headers: tab.originalRequest.headers || {},
    body: tab.originalRequest.body || '',
    auth: normalizeAuth((tab.originalRequest as any).auth),
  });
  
  return current !== original;
};

export const openNewTab = (set: SetState, _get: GetState): string => {
  const newTab = createNewTab();
  
  set((state: any) => ({
    tabs: {
      ...state.tabs,
      [newTab.id]: newTab,
    },
    tabOrder: [...state.tabOrder, newTab.id],
    activeTabId: newTab.id,
  }));
  
  return newTab.id;
};

export const openRequestTab = (
  set: SetState,
  get: GetState,
  { savedRequestId, collectionId, request, label }: {
    savedRequestId: string;
    collectionId: string;
    request: TabRequest;
    label: string;
  }
): string => {
  // Check if tab already exists for this saved request
  const existingTab = getTabBySavedRequestId(get, savedRequestId);
  if (existingTab) {
    activateTab(set, get, existingTab.id);
    return existingTab.id;
  }
  
  // Normalize auth field to prevent false dirty state
  // If auth is undefined, set it to { type: 'none' } to match form defaults
  const normalizedRequest = {
    ...request,
    auth: request.auth || { type: 'none' as const },
  };
  
  // Create new tab with request data
  const newTab = createNewTab({
    label,
    request: { ...normalizedRequest },
    savedRequestId,
    collectionId,
    originalRequest: { ...normalizedRequest }, // Store original for dirty detection
    isDirty: false,
  });
  
  set((state: any) => ({
    tabs: {
      ...state.tabs,
      [newTab.id]: newTab,
    },
    tabOrder: [...state.tabOrder, newTab.id],
    activeTabId: newTab.id,
  }));
  
  return newTab.id;
};

export const activateTab = (set: SetState, get: GetState, tabId: string): void => {
  const tab = get().tabs[tabId];
  if (!tab) return;
  
  set((state: any) => ({
    tabs: {
      ...state.tabs,
      [tabId]: {
        ...tab,
        lastAccessedAt: Date.now(),
      },
    },
    activeTabId: tabId,
  }));
};

export const closeTab = (set: SetState, get: GetState, tabId: string): void => {
  const state = get();
  const { tabs, tabOrder, activeTabId } = state;
  
  // Don't close if it's the last tab - create a new empty tab instead
  if (tabOrder.length === 1) {
    const emptyTab = createNewTab();
    set({
      tabs: { [emptyTab.id]: emptyTab },
      tabOrder: [emptyTab.id],
      activeTabId: emptyTab.id,
    });
    return;
  }
  
  // Remove tab
  const newTabs = { ...tabs };
  delete newTabs[tabId];
  const newTabOrder = tabOrder.filter((id: string) => id !== tabId);
  
  // Determine new active tab if we're closing the active one
  let newActiveTabId = activeTabId;
  if (activeTabId === tabId) {
    const closedIndex = tabOrder.indexOf(tabId);
    // Activate the tab to the right, or the one to the left if we're closing the rightmost
    const nextIndex = closedIndex < tabOrder.length - 1 ? closedIndex + 1 : closedIndex - 1;
    newActiveTabId = tabOrder[nextIndex];
  }
  
  set({
    tabs: newTabs,
    tabOrder: newTabOrder,
    activeTabId: newActiveTabId,
  });
};

export const updateTabRequest = (
  set: SetState,
  get: GetState,
  tabId: string,
  requestUpdate: Partial<TabRequest>
): void => {
  const state = get();
  const tab = state.tabs[tabId];
  if (!tab) return;
  
  const updatedRequest = {
    ...tab.request,
    ...requestUpdate,
  };
  
  const updatedTab = {
    ...tab,
    request: updatedRequest,
    isDirty: calculateDirtyState({
      ...tab,
      request: updatedRequest,
    }),
  };
  
  set((state: any) => ({
    tabs: {
      ...state.tabs,
      [tabId]: updatedTab,
    },
  }));
};

export const setTabResponse = (
  set: SetState,
  tabId: string,
  response: ProxyResponse | StreamingResponse | null
): void => {
  set((state: any) => {
    const tab = state.tabs[tabId];
    if (!tab) return state;
    
    return {
      tabs: {
        ...state.tabs,
        [tabId]: {
          ...tab,
          response,
          error: null, // Clear error on successful response
        },
      },
    };
  });
};

export const setTabLoading = (set: SetState, tabId: string, isLoading: boolean): void => {
  set((state: any) => {
    const tab = state.tabs[tabId];
    if (!tab) return state;
    
    return {
      tabs: {
        ...state.tabs,
        [tabId]: {
          ...tab,
          isLoading,
        },
      },
    };
  });
};

export const setTabError = (set: SetState, tabId: string, error: string | null): void => {
  set((state: any) => {
    const tab = state.tabs[tabId];
    if (!tab) return state;
    
    return {
      tabs: {
        ...state.tabs,
        [tabId]: {
          ...tab,
          error,
          response: null, // Clear response on error
        },
      },
    };
  });
};

export const markTabAsSaved = (
  set: SetState,
  tabId: string,
  savedRequestId: string,
  collectionId: string
): void => {
  set((state: any) => {
    const tab = state.tabs[tabId];
    if (!tab) return state;
    
    return {
      tabs: {
        ...state.tabs,
        [tabId]: {
          ...tab,
          savedRequestId,
          collectionId,
          originalRequest: { ...tab.request },
          isDirty: false,
        },
      },
    };
  });
};

export const updateTabLabel = (set: SetState, tabId: string, label: string): void => {
  set((state: any) => {
    const tab = state.tabs[tabId];
    if (!tab) return state;
    
    return {
      tabs: {
        ...state.tabs,
        [tabId]: {
          ...tab,
          label,
        },
      },
    };
  });
};

export const getTabBySavedRequestId = (get: GetState, savedRequestId: string): Tab | null => {
  const state = get();
  const tab = Object.values(state.tabs).find(
    (t: any) => t.savedRequestId === savedRequestId
  );
  return (tab as Tab) || null;
};

export const getActiveTab = (get: GetState): Tab | null => {
  const state = get();
  if (!state.activeTabId) return null;
  return state.tabs[state.activeTabId] || null;
};

export const closeAllTabs = (set: SetState): void => {
  const emptyTab = createNewTab();
  set({
    tabs: { [emptyTab.id]: emptyTab },
    tabOrder: [emptyTab.id],
    activeTabId: emptyTab.id,
  });
};

export const reorderTabs = (set: SetState, newOrder: string[]): void => {
  set({ tabOrder: newOrder });
};

/**
 * Get request history
 */
export const getHistory = async (): Promise<HistoryItem[]> => {
  const response = await fetch(`${API_BASE}/history`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch history');
  }
  
  return response.json();
};

/**
 * Clear all history
 */
export const clearHistory = async (): Promise<void> => {
  const response = await fetch(`${API_BASE}/history`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to clear history');
  }
};
