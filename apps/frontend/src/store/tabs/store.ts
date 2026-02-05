import { create } from 'zustand';
import { Tab, TabRequest, ProxyResponse, StreamingResponse } from '../../types';
import {
  openNewTab,
  openRequestTab,
  activateTab,
  closeTab,
  updateTabRequest,
  setTabResponse,
  setTabLoading,
  setTabError,
  markTabAsSaved,
  updateTabLabel,
  getTabBySavedRequestId,
  getActiveTab,
  closeAllTabs,
  reorderTabs,
} from './actions';

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

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: {},
  tabOrder: [],
  activeTabId: null,
  
  openNewTab: () => openNewTab(set, get),
  openRequestTab: (params) => openRequestTab(set, get, params),
  activateTab: (tabId) => activateTab(set, get, tabId),
  closeTab: (tabId) => closeTab(set, get, tabId),
  updateTabRequest: (tabId, request) => updateTabRequest(set, get, tabId, request),
  setTabResponse: (tabId, response) => setTabResponse(set, tabId, response),
  setTabLoading: (tabId, isLoading) => setTabLoading(set, tabId, isLoading),
  setTabError: (tabId, error) => setTabError(set, tabId, error),
  markTabAsSaved: (tabId, savedRequestId, collectionId) => 
    markTabAsSaved(set, tabId, savedRequestId, collectionId),
  updateTabLabel: (tabId, label) => updateTabLabel(set, tabId, label),
  getTabBySavedRequestId: (savedRequestId) => getTabBySavedRequestId(get, savedRequestId),
  getActiveTab: () => getActiveTab(get),
  closeAllTabs: () => closeAllTabs(set),
  reorderTabs: (newOrder) => reorderTabs(set, newOrder),
}));

// Initialize with one empty tab on store creation
useTabsStore.getState().openNewTab();
