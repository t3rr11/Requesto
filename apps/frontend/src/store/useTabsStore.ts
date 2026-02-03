import { create } from 'zustand';
import { Tab, TabRequest, ProxyResponse, StreamingResponse } from '../types';

interface TabsState {
  // Normalized state
  tabs: Record<string, Tab>; // key: tabId
  tabOrder: string[]; // Array of tab IDs in display order
  activeTabId: string | null; // Currently active tab
  
  // Actions
  
  /**
   * Open a new empty tab
   */
  openNewTab: () => string;
  
  /**
   * Open a tab for a saved request from collections
   * If tab already exists for this request, activate it instead
   */
  openRequestTab: (params: {
    savedRequestId: string;
    collectionId: string;
    request: TabRequest;
    label: string;
  }) => string;
  
  /**
   * Activate (focus) a specific tab
   */
  activateTab: (tabId: string) => void;
  
  /**
   * Close a tab by ID
   * Activates the next available tab or creates new one if last tab closed
   */
  closeTab: (tabId: string) => void;
  
  /**
   * Update the request data for a tab
   */
  updateTabRequest: (tabId: string, request: Partial<TabRequest>) => void;
  
  /**
   * Set the response for a tab
   */
  setTabResponse: (tabId: string, response: ProxyResponse | StreamingResponse | null) => void;
  
  /**
   * Set loading state for a tab
   */
  setTabLoading: (tabId: string, isLoading: boolean) => void;
  
  /**
   * Set error for a tab
   */
  setTabError: (tabId: string, error: string | null) => void;
  
  /**
   * Mark a tab's request as saved (links to collection and clears dirty flag)
   */
  markTabAsSaved: (tabId: string, savedRequestId: string, collectionId: string) => void;
  
  /**
   * Update tab label
   */
  updateTabLabel: (tabId: string, label: string) => void;
  
  /**
   * Get tab by saved request ID (for finding existing tabs)
   */
  getTabBySavedRequestId: (savedRequestId: string) => Tab | null;
  
  /**
   * Get active tab
   */
  getActiveTab: () => Tab | null;
  
  /**
   * Close all tabs
   */
  closeAllTabs: () => void;
  
  /**
   * Reorder tabs (for drag-and-drop if implemented later)
   */
  reorderTabs: (newOrder: string[]) => void;
}

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
  
  const current = JSON.stringify({
    method: tab.request.method,
    url: tab.request.url,
    headers: tab.request.headers,
    body: tab.request.body,
    auth: (tab.request as any).auth,
  });
  
  const original = JSON.stringify({
    method: tab.originalRequest.method,
    url: tab.originalRequest.url,
    headers: tab.originalRequest.headers,
    body: tab.originalRequest.body,
    auth: (tab.originalRequest as any).auth,
  });
  
  return current !== original;
};

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: {},
  tabOrder: [],
  activeTabId: null,
  
  openNewTab: () => {
    const newTab = createNewTab();
    
    set((state) => ({
      tabs: {
        ...state.tabs,
        [newTab.id]: newTab,
      },
      tabOrder: [...state.tabOrder, newTab.id],
      activeTabId: newTab.id,
    }));
    
    return newTab.id;
  },
  
  openRequestTab: ({ savedRequestId, collectionId, request, label }) => {
    // Check if tab already exists for this saved request
    const existingTab = get().getTabBySavedRequestId(savedRequestId);
    if (existingTab) {
      get().activateTab(existingTab.id);
      return existingTab.id;
    }
    
    // Create new tab with request data
    const newTab = createNewTab({
      label,
      request: { ...request },
      savedRequestId,
      collectionId,
      originalRequest: { ...request }, // Store original for dirty detection
      isDirty: false,
    });
    
    set((state) => ({
      tabs: {
        ...state.tabs,
        [newTab.id]: newTab,
      },
      tabOrder: [...state.tabOrder, newTab.id],
      activeTabId: newTab.id,
    }));
    
    return newTab.id;
  },
  
  activateTab: (tabId) => {
    const tab = get().tabs[tabId];
    if (!tab) return;
    
    set((state) => ({
      tabs: {
        ...state.tabs,
        [tabId]: {
          ...tab,
          lastAccessedAt: Date.now(),
        },
      },
      activeTabId: tabId,
    }));
  },
  
  closeTab: (tabId) => {
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
    const newTabOrder = tabOrder.filter(id => id !== tabId);
    
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
  },
  
  updateTabRequest: (tabId, requestUpdate) => {
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
    
    set((state) => ({
      tabs: {
        ...state.tabs,
        [tabId]: updatedTab,
      },
    }));
  },
  
  setTabResponse: (tabId, response) => {
    set((state) => {
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
  },
  
  setTabLoading: (tabId, isLoading) => {
    set((state) => {
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
  },
  
  setTabError: (tabId, error) => {
    set((state) => {
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
  },
  
  markTabAsSaved: (tabId, savedRequestId, collectionId) => {
    set((state) => {
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
  },
  
  updateTabLabel: (tabId, label) => {
    set((state) => {
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
  },
  
  getTabBySavedRequestId: (savedRequestId) => {
    const state = get();
    const tab = Object.values(state.tabs).find(
      t => t.savedRequestId === savedRequestId
    );
    return tab || null;
  },
  
  getActiveTab: () => {
    const state = get();
    if (!state.activeTabId) return null;
    return state.tabs[state.activeTabId] || null;
  },
  
  closeAllTabs: () => {
    const emptyTab = createNewTab();
    set({
      tabs: { [emptyTab.id]: emptyTab },
      tabOrder: [emptyTab.id],
      activeTabId: emptyTab.id,
    });
  },
  
  reorderTabs: (newOrder) => {
    set({ tabOrder: newOrder });
  },
}));

// Initialize with one empty tab
const initialTab = createNewTab();
useTabsStore.setState({
  tabs: { [initialTab.id]: initialTab },
  tabOrder: [initialTab.id],
  activeTabId: initialTab.id,
});
