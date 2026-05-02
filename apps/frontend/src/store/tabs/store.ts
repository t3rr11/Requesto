import { create } from 'zustand';
import type { Tab, TabRequest } from './types';
import type { ProxyResponse, StreamingResponse } from '../request/types';
import * as actions from './actions';
import { TestResult } from '../../helpers/scriptRunner';

export { getHistory, clearHistory } from './actions';

type TabsState = {
  tabs: Record<string, Tab>;
  tabOrder: string[];
  activeTabId: string | null;

  openNewTab: () => string;
  openRequestTab: (params: {
    savedRequestId: string;
    collectionId: string;
    request: TabRequest;
    label: string;
  }) => string;
  activateTab: (tabId: string) => void;
  touchTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  updateTabRequest: (tabId: string, request: Partial<TabRequest>) => void;
  setTabResponse: (tabId: string, response: ProxyResponse | StreamingResponse | null) => void;
  setTabLoading: (tabId: string, isLoading: boolean) => void;
  setTabError: (tabId: string, error: string | null) => void;
  markTabAsSaved: (tabId: string, savedRequestId: string, collectionId: string) => void;
  updateTabLabel: (tabId: string, label: string) => void;
  getTabBySavedRequestId: (savedRequestId: string) => Tab | null;
  getActiveTab: () => Tab | null;
  closeAllTabs: () => void;
  reorderTabs: (newOrder: string[]) => void;
  setTabTestResults: (tabId: string, testResults: TestResult[]) => void;
};

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: {},
  tabOrder: [],
  activeTabId: null,

  openNewTab: () => actions.openNewTab(set, get),
  openRequestTab: (params) => actions.openRequestTab(set, get, params),
  activateTab: (tabId) => actions.activateTab(set, get, tabId),
  touchTab: (tabId) => actions.touchTab(set, get, tabId),
  closeTab: (tabId) => actions.closeTab(set, get, tabId),
  updateTabRequest: (tabId, request) => actions.updateTabRequest(set, get, tabId, request),
  setTabResponse: (tabId, response) => actions.setTabResponse(set, tabId, response),
  setTabLoading: (tabId, isLoading) => actions.setTabLoading(set, tabId, isLoading),
  setTabError: (tabId, error) => actions.setTabError(set, tabId, error),
  markTabAsSaved: (tabId, savedRequestId, collectionId) =>
    actions.markTabAsSaved(set, tabId, savedRequestId, collectionId),
  updateTabLabel: (tabId, label) => actions.updateTabLabel(set, tabId, label),
  getTabBySavedRequestId: (savedRequestId) => actions.getTabBySavedRequestId(get, savedRequestId),
  getActiveTab: () => actions.getActiveTab(get),
  closeAllTabs: () => actions.closeAllTabs(set),
  reorderTabs: (newOrder) => actions.reorderTabs(set, newOrder),
  setTabTestResults: (tabId, testResults) => actions.setTabTestResults(set, tabId, testResults),
}));

// Open one empty tab on store creation
useTabsStore.getState().openNewTab();
