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
