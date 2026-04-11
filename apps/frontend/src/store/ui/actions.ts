import type { LayoutMode } from './types';

type UISetState = (partial: Record<string, unknown> | ((state: Record<string, unknown>) => Record<string, unknown>)) => void;

// ── Sidebar ──────────────────────────────────────────────────────────────────

export function toggleSidebar(set: UISetState): void {
  set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
}

export function setSidebarOpen(set: UISetState, isOpen: boolean): void {
  set({ isSidebarOpen: isOpen });
}

export function setSidebarWidth(set: UISetState, width: number): void {
  set({ sidebarWidth: width });
}

// ── Panel dimensions ─────────────────────────────────────────────────────────

export function setRequestPanelWidth(set: UISetState, width: number): void {
  set({ requestPanelWidth: width });
}

export function setRequestPanelHeight(set: UISetState, height: number): void {
  set({ requestPanelHeight: height });
}

export function togglePanelLayout(set: UISetState): void {
  set((state) => ({
    panelLayout: state.panelLayout === 'horizontal' ? 'vertical' : 'horizontal',
  }));
}

export function setPanelLayout(set: UISetState, layout: LayoutMode): void {
  set({ panelLayout: layout });
}

// ── Console ──────────────────────────────────────────────────────────────────

export function toggleConsole(set: UISetState): void {
  set((state) => ({ isConsoleOpen: !state.isConsoleOpen }));
}

export function setConsoleOpen(set: UISetState, isOpen: boolean): void {
  set({ isConsoleOpen: isOpen });
}

export function setConsoleHeight(set: UISetState, height: number): void {
  set({ consoleHeight: height });
}

// ── Collection / folder expand ───────────────────────────────────────────────

export function toggleCollection(set: UISetState, id: string): void {
  set((state) => {
    const prev = state.expandedCollections as Set<string>;
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { expandedCollections: next };
  });
}

export function expandCollection(set: UISetState, id: string): void {
  set((state) => ({
    expandedCollections: new Set(state.expandedCollections as Set<string>).add(id),
  }));
}

export function toggleFolder(set: UISetState, id: string): void {
  set((state) => {
    const prev = state.expandedFolders as Set<string>;
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { expandedFolders: next };
  });
}

export function expandFolder(set: UISetState, id: string): void {
  set((state) => ({
    expandedFolders: new Set(state.expandedFolders as Set<string>).add(id),
  }));
}

// ── Multi-select ─────────────────────────────────────────────────────────────

export function toggleRequestSelection(
  set: UISetState,
  requestId: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  allRequestIds?: string[],
): void {
  set((state) => {
    const prev = state.selectedRequestIds as Set<string>;
    const next = new Set(prev);
    const lastId = state.lastSelectedRequestId as string | null;

    if (shiftKey && lastId && allRequestIds) {
      const lastIdx = allRequestIds.indexOf(lastId);
      const curIdx = allRequestIds.indexOf(requestId);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        for (let i = start; i <= end; i++) next.add(allRequestIds[i]);
      }
    } else if (!ctrlKey) {
      next.clear();
      next.add(requestId);
    } else {
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
    }

    return { selectedRequestIds: next, lastSelectedRequestId: requestId };
  });
}

export function clearSelection(set: UISetState): void {
  set({ selectedRequestIds: new Set<string>(), lastSelectedRequestId: null });
}
