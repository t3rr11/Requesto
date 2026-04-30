import type { Tab, TabRequest, HistoryItem } from './types';
import type { ProxyResponse, StreamingResponse } from '../request/types';
import { isTabDirty } from '../../helpers/tabs';
import { API_BASE } from '../../helpers/api/config';

type SetState = (partial: Record<string, unknown> | ((state: Record<string, unknown>) => Record<string, unknown>)) => void;
type GetState = () => Record<string, unknown>;

let tabCounter = 0;

function createNewTab(overrides?: Partial<Tab>): Tab {
  tabCounter++;
  const now = Date.now();
  return {
    id: `tab-${now}-${tabCounter}`,
    label: 'New Request',
    request: { method: 'GET', url: '' },
    response: null,
    isDirty: false,
    isTouched: false,
    isLoading: false,
    error: null,
    lastAccessedAt: now,
    ...overrides,
  };
}

export function openNewTab(set: SetState, get: GetState): string {
  const tab = createNewTab({ isTouched: true });

  // Check if there is a non-touched tab, if so close that request before opening the new one.
  const tabs = get().tabs as Record<string, Tab>;
  const nonTouchedTabId = Object.values(tabs).find((t) => !t.isTouched)?.id;
  if (nonTouchedTabId) {
    closeTab(set, get, nonTouchedTabId);
  }

  set((state) => ({
    tabs: { ...(state.tabs as Record<string, Tab>), [tab.id]: tab },
    tabOrder: [...(state.tabOrder as string[]), tab.id],
    activeTabId: tab.id,
  }));

  return tab.id;
}

export function openRequestTab(
  set: SetState,
  get: GetState,
  params: { savedRequestId: string; collectionId: string; request: TabRequest; label: string },
): string {
  const tabs = get().tabs as Record<string, Tab>;
  const existing = getTabBySavedRequestId(get, params.savedRequestId);
  if (existing) {
    activateTab(set, get, existing.id);
    return existing.id;
  }

  const normalizedRequest = {
    ...params.request,
    auth: params.request.auth || { type: 'none' as const },
  };

  // Check if there is a non-touched tab, if so close that request before opening the new one.
  const nonTouchedTabId = Object.values(tabs).find((t) => !t.isTouched)?.id;
  if (nonTouchedTabId) {
    closeTab(set, get, nonTouchedTabId);
  }

  const tab = createNewTab({
    label: params.label,
    request: { ...normalizedRequest },
    savedRequestId: params.savedRequestId,
    collectionId: params.collectionId,
    originalRequest: { ...normalizedRequest },
    isDirty: false,
    isTouched: false,
  });

  set((state) => ({
    tabs: { ...(state.tabs as Record<string, Tab>), [tab.id]: tab },
    tabOrder: [...(state.tabOrder as string[]), tab.id],
    activeTabId: tab.id,
  }));
  return tab.id;
}

export function activateTab(set: SetState, get: GetState, tabId: string): void {
  const tabs = get().tabs as Record<string, Tab>;
  const tab = tabs[tabId];
  if (!tab) return;

  set((state) => ({
    tabs: {
      ...(state.tabs as Record<string, Tab>),
      [tabId]: { ...tab, lastAccessedAt: Date.now() },
    },
    activeTabId: tabId,
  }));
}

export function touchTab(set: SetState, get: GetState, tabId: string): void {
  const tabs = get().tabs as Record<string, Tab>;
  const tab = tabs[tabId];
  if (!tab) return;

  set((state) => ({
    tabs: {
      ...(state.tabs as Record<string, Tab>),
      [tabId]: { ...tab, isTouched: true },
    },
  }));
}

export function closeTab(set: SetState, get: GetState, tabId: string): void {
  const state = get();
  const tabs = state.tabs as Record<string, Tab>;
  const tabOrder = state.tabOrder as string[];
  const activeTabId = state.activeTabId as string | null;

  if (tabOrder.length === 1) {
    const empty = createNewTab();
    set({ tabs: { [empty.id]: empty }, tabOrder: [empty.id], activeTabId: empty.id });
    return;
  }

  const newTabs = { ...tabs };
  delete newTabs[tabId];
  const newOrder = tabOrder.filter((id) => id !== tabId);

  let newActiveId = activeTabId;
  if (activeTabId === tabId) {
    const idx = tabOrder.indexOf(tabId);
    const nextIdx = idx < tabOrder.length - 1 ? idx + 1 : idx - 1;
    newActiveId = tabOrder[nextIdx];
  }

  set({ tabs: newTabs, tabOrder: newOrder, activeTabId: newActiveId });
}

export function updateTabRequest(
  set: SetState, get: GetState, tabId: string, requestUpdate: Partial<TabRequest>,
): void {
  const tabs = get().tabs as Record<string, Tab>;
  const tab = tabs[tabId];
  if (!tab) return;

  const updatedRequest = { ...tab.request, ...requestUpdate };
  const updatedTab: Tab = { ...tab, request: updatedRequest };
  updatedTab.isDirty = isTabDirty(updatedTab);

  set((state) => ({
    tabs: { ...(state.tabs as Record<string, Tab>), [tabId]: updatedTab },
  }));
}

export function setTabResponse(
  set: SetState, tabId: string, response: ProxyResponse | StreamingResponse | null,
): void {
  set((state) => {
    const tabs = state.tabs as Record<string, Tab>;
    const tab = tabs[tabId];
    if (!tab) return state;
    return { tabs: { ...tabs, [tabId]: { ...tab, response, error: null } } };
  });
}

export function setTabLoading(set: SetState, tabId: string, isLoading: boolean): void {
  set((state) => {
    const tabs = state.tabs as Record<string, Tab>;
    const tab = tabs[tabId];
    if (!tab) return state;
    return { tabs: { ...tabs, [tabId]: { ...tab, isLoading } } };
  });
}

export function setTabError(set: SetState, tabId: string, error: string | null): void {
  set((state) => {
    const tabs = state.tabs as Record<string, Tab>;
    const tab = tabs[tabId];
    if (!tab) return state;
    return { tabs: { ...tabs, [tabId]: { ...tab, error, response: null } } };
  });
}

export function markTabAsSaved(
  set: SetState, tabId: string, savedRequestId: string, collectionId: string,
): void {
  set((state) => {
    const tabs = state.tabs as Record<string, Tab>;
    const tab = tabs[tabId];
    if (!tab) return state;
    return {
      tabs: {
        ...tabs,
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
}

export function updateTabLabel(set: SetState, tabId: string, label: string): void {
  set((state) => {
    const tabs = state.tabs as Record<string, Tab>;
    const tab = tabs[tabId];
    if (!tab) return state;
    return { tabs: { ...tabs, [tabId]: { ...tab, label } } };
  });
}

export function getTabBySavedRequestId(get: GetState, savedRequestId: string): Tab | null {
  const tabs = get().tabs as Record<string, Tab>;
  return Object.values(tabs).find((t) => t.savedRequestId === savedRequestId) ?? null;
}

export function getActiveTab(get: GetState): Tab | null {
  const state = get();
  const activeTabId = state.activeTabId as string | null;
  if (!activeTabId) return null;
  return (state.tabs as Record<string, Tab>)[activeTabId] ?? null;
}

export function closeAllTabs(set: SetState): void {
  const empty = createNewTab({ isTouched: true });
  set({ tabs: { [empty.id]: empty }, tabOrder: [empty.id], activeTabId: empty.id });
}

export function reorderTabs(set: SetState, newOrder: string[]): void {
  set({ tabOrder: newOrder });
}

// ── History API helpers ──────────────────────────────────────────────────────

export async function getHistory(): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function clearHistory(): Promise<void> {
  const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear history');
}
