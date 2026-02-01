import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {  
  // Sidebar and console
  isSidebarOpen: boolean;
  sidebarWidth: number;
  requestPanelWidth: number;
  isConsoleOpen: boolean;
  consoleHeight: number;
  
  // Collections and folders expand/collapse state
  expandedCollections: Set<string>;
  expandedFolders: Set<string>;
  
  // Dialog states
  isHelpOpen: boolean;
  isNewCollectionOpen: boolean;
  isSaveRequestOpen: boolean;
  isNewRequestOpen: boolean;
  
  // Dialog context
  newRequestContext: {
    collectionId?: string;
    folderId?: string;
  } | null;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setRequestPanelWidth: (width: number) => void;
  
  toggleConsole: () => void;
  setConsoleOpen: (isOpen: boolean) => void;
  setConsoleHeight: (height: number) => void;
  
  toggleCollection: (id: string) => void;
  toggleFolder: (id: string) => void;
  expandCollection: (id: string) => void;
  expandFolder: (id: string) => void;
  
  openHelp: () => void;
  closeHelp: () => void;
  
  openNewCollection: () => void;
  closeNewCollection: () => void;
  
  openSaveRequest: () => void;
  closeSaveRequest: () => void;
  
  openNewRequest: (collectionId?: string, folderId?: string) => void;
  closeNewRequest: () => void;
  
  closeAllDialogs: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      isSidebarOpen: true,
      sidebarWidth: 320,
      requestPanelWidth: 600,
      isConsoleOpen: false,
      consoleHeight: 250,
      expandedCollections: new Set<string>(),
      expandedFolders: new Set<string>(),
      isHelpOpen: false,
      isNewCollectionOpen: false,
      isSaveRequestOpen: false,
      isNewRequestOpen: false,
      newRequestContext: null,
      
      // Actions
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setRequestPanelWidth: (width) => set({ requestPanelWidth: width }),
      
      toggleConsole: () => set((state) => ({ isConsoleOpen: !state.isConsoleOpen })),
      setConsoleOpen: (isOpen) => set({ isConsoleOpen: isOpen }),
      setConsoleHeight: (height) => set({ consoleHeight: height }),
      
      toggleCollection: (id) => set((state) => {
        const newExpanded = new Set(state.expandedCollections);
        if (newExpanded.has(id)) {
          newExpanded.delete(id);
        } else {
          newExpanded.add(id);
        }
        return { expandedCollections: newExpanded };
      }),
      
      toggleFolder: (id) => set((state) => {
        const newExpanded = new Set(state.expandedFolders);
        if (newExpanded.has(id)) {
          newExpanded.delete(id);
        } else {
          newExpanded.add(id);
        }
        return { expandedFolders: newExpanded };
      }),
      
      expandCollection: (id) => set((state) => ({
        expandedCollections: new Set(state.expandedCollections).add(id),
      })),
      
      expandFolder: (id) => set((state) => ({
        expandedFolders: new Set(state.expandedFolders).add(id),
      })),
      
      openHelp: () => set({ isHelpOpen: true }),
      closeHelp: () => set({ isHelpOpen: false }),
      
      openNewCollection: () => set({ isNewCollectionOpen: true }),
      closeNewCollection: () => set({ isNewCollectionOpen: false }),
      
      openSaveRequest: () => set({ isSaveRequestOpen: true }),
      closeSaveRequest: () => set({ isSaveRequestOpen: false }),
      
      openNewRequest: (collectionId, folderId) => set({ 
        isNewRequestOpen: true, 
        newRequestContext: { collectionId, folderId } 
      }),
      closeNewRequest: () => set({ isNewRequestOpen: false, newRequestContext: null }),
      
      closeAllDialogs: () => set({
        isHelpOpen: false,
        isNewCollectionOpen: false,
        isSaveRequestOpen: false,
        isNewRequestOpen: false,
        newRequestContext: null,
      }),
    }),
    {
      name: 'localman-ui-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              expandedCollections: new Set(state.expandedCollections || []),
              expandedFolders: new Set(state.expandedFolders || []),
            },
          };
        },
        setItem: (name, value) => {
          const { state } = value;
          localStorage.setItem(
            name,
            JSON.stringify({
              state: {
                ...state,
                expandedCollections: Array.from(state.expandedCollections),
                expandedFolders: Array.from(state.expandedFolders),
              },
            })
          );
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        sidebarWidth: state.sidebarWidth,
        requestPanelWidth: state.requestPanelWidth,
        isConsoleOpen: state.isConsoleOpen,
        consoleHeight: state.consoleHeight,
        expandedCollections: state.expandedCollections,
        expandedFolders: state.expandedFolders,
      }),
    }
  )
);
