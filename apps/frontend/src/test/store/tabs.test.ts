import { describe, it, expect, beforeEach } from 'vitest';
import { useTabsStore } from '../../store/tabs/store';

describe('tabs store', () => {
  beforeEach(() => {
    // Reset to a single initial tab
    useTabsStore.setState({
      tabs: {},
      tabOrder: [],
      activeTabId: null,
    });
    useTabsStore.getState().openNewTab();
  });

  it('initializes with one tab', () => {
    const state = useTabsStore.getState();
    expect(state.tabOrder.length).toBe(1);
    expect(state.activeTabId).toBe(state.tabOrder[0]);
  });

  it('opens a new tab', () => {
    useTabsStore.getState().openNewTab();
    expect(useTabsStore.getState().tabOrder.length).toBe(2);
  });

  it('opens a request tab', () => {
    const savedId = 'saved-1';
    useTabsStore.getState().openRequestTab({
      savedRequestId: savedId,
      collectionId: 'col-1',
      label: 'Test Request',
      request: {
        method: 'GET',
        url: 'https://api.example.com',
        headers: {},
        body: '',
      },
    });

    const state = useTabsStore.getState();
    const newTab = state.tabs[state.activeTabId!];
    expect(newTab.request.url).toBe('https://api.example.com');
    expect(newTab.savedRequestId).toBe(savedId);
  });

  it('deduplicates request tabs by savedRequestId', () => {
    const tabData = {
      savedRequestId: 'dup-1',
      collectionId: 'col-1',
      label: 'Test',
      request: {
        method: 'GET' as const,
        url: 'https://api.example.com',
        headers: {},
        body: '',
      },
    };
    useTabsStore.getState().openRequestTab(tabData);
    const countBefore = useTabsStore.getState().tabOrder.length;
    useTabsStore.getState().openRequestTab(tabData);
    expect(useTabsStore.getState().tabOrder.length).toBe(countBefore);
  });

  it('activates a tab', () => {
    useTabsStore.getState().openNewTab();
    const state = useTabsStore.getState();
    const firstTabId = state.tabOrder[0];
    useTabsStore.getState().activateTab(firstTabId);
    expect(useTabsStore.getState().activeTabId).toBe(firstTabId);
  });

  it('closes a tab and falls back', () => {
    useTabsStore.getState().openNewTab();
    const state = useTabsStore.getState();
    const toClose = state.activeTabId!;
    useTabsStore.getState().closeTab(toClose);
    expect(useTabsStore.getState().tabOrder).not.toContain(toClose);
    expect(useTabsStore.getState().activeTabId).not.toBeNull();
  });

  it('creates new tab when closing the last one', () => {
    const state = useTabsStore.getState();
    expect(state.tabOrder.length).toBe(1);
    useTabsStore.getState().closeTab(state.tabOrder[0]);
    const after = useTabsStore.getState();
    expect(after.tabOrder.length).toBe(1);
    expect(after.activeTabId).not.toBeNull();
  });

  it('updates tab request fields', () => {
    const state = useTabsStore.getState();
    const tabId = state.activeTabId!;
    useTabsStore.getState().updateTabRequest(tabId, { url: 'https://changed.com' });
    expect(useTabsStore.getState().tabs[tabId].request.url).toBe('https://changed.com');
  });

  it('sets response on a tab', () => {
    const state = useTabsStore.getState();
    const tabId = state.activeTabId!;
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      body: '{}',
      bodyEncoding: 'utf8' as const,
      duration: 100,
      size: 2,
    };
    useTabsStore.getState().setTabResponse(tabId, mockResponse);
    expect(useTabsStore.getState().tabs[tabId].response).toEqual(mockResponse);
  });

  it('sets loading state', () => {
    const state = useTabsStore.getState();
    const tabId = state.activeTabId!;
    useTabsStore.getState().setTabLoading(tabId, true);
    expect(useTabsStore.getState().tabs[tabId].isLoading).toBe(true);
  });

  it('sets error on tab', () => {
    const state = useTabsStore.getState();
    const tabId = state.activeTabId!;
    useTabsStore.getState().setTabError(tabId, 'Connection refused');
    expect(useTabsStore.getState().tabs[tabId].error).toBe('Connection refused');
  });
});
