import { StoreApi } from 'zustand';

type SetState = StoreApi<any>['setState'];

// Sidebar actions
export const toggleSidebar = (set: SetState) => {
  set((state: any) => ({ isSidebarOpen: !state.isSidebarOpen }));
};

export const setSidebarOpen = (set: SetState, isOpen: boolean) => {
  set({ isSidebarOpen: isOpen });
};

export const setSidebarWidth = (set: SetState, width: number) => {
  set({ sidebarWidth: width });
};

export const setRequestPanelWidth = (set: SetState, width: number) => {
  set({ requestPanelWidth: width });
};

// Console actions
export const toggleConsole = (set: SetState) => {
  set((state: any) => ({ isConsoleOpen: !state.isConsoleOpen }));
};

export const setConsoleOpen = (set: SetState, isOpen: boolean) => {
  set({ isConsoleOpen: isOpen });
};

export const setConsoleHeight = (set: SetState, height: number) => {
  set({ consoleHeight: height });
};

// Collection expand/collapse actions
export const toggleCollection = (set: SetState, id: string) => {
  set((state: any) => {
    const newExpanded = new Set(state.expandedCollections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    return { expandedCollections: newExpanded };
  });
};

export const expandCollection = (set: SetState, id: string) => {
  set((state: any) => ({
    expandedCollections: new Set(state.expandedCollections).add(id),
  }));
};

// Folder expand/collapse actions
export const toggleFolder = (set: SetState, id: string) => {
  set((state: any) => {
    const newExpanded = new Set(state.expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    return { expandedFolders: newExpanded };
  });
};

export const expandFolder = (set: SetState, id: string) => {
  set((state: any) => ({
    expandedFolders: new Set(state.expandedFolders).add(id),
  }));
};

// Multi-select actions
export const toggleRequestSelection = (
  set: SetState, 
  requestId: string, 
  ctrlKey: boolean, 
  shiftKey: boolean,
  allRequestIds?: string[]
) => {
  set((state: any) => {
    const newSelected = new Set(state.selectedRequestIds);
    
    if (shiftKey && state.lastSelectedRequestId && allRequestIds) {
      // Range select - select all items between last selected and current
      const lastIndex = allRequestIds.indexOf(state.lastSelectedRequestId);
      const currentIndex = allRequestIds.indexOf(requestId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        
        // Select all items in range
        for (let i = start; i <= end; i++) {
          newSelected.add(allRequestIds[i]);
        }
      }
    } else if (!ctrlKey) {
      // Single select - clear all and select only this one
      newSelected.clear();
      newSelected.add(requestId);
    } else {
      // Multi-select with CTRL - toggle selection
      if (newSelected.has(requestId)) {
        newSelected.delete(requestId);
      } else {
        newSelected.add(requestId);
      }
    }
    
    return { 
      selectedRequestIds: newSelected,
      lastSelectedRequestId: requestId,
    };
  });
};

export const clearSelection = (set: SetState) => {
  set({ 
    selectedRequestIds: new Set(),
    lastSelectedRequestId: null,
  });
};
