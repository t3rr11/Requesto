import { create } from 'zustand';

interface UIState {
  // Sidebar and console
  isSidebarOpen: boolean;
  isConsoleOpen: boolean;
  consoleHeight: number;
  
  // Dialog states
  isEnvironmentManagerOpen: boolean;
  isKeyboardShortcutsOpen: boolean;
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
  
  toggleConsole: () => void;
  setConsoleOpen: (isOpen: boolean) => void;
  setConsoleHeight: (height: number) => void;
  
  openEnvironmentManager: () => void;
  closeEnvironmentManager: () => void;
  
  openKeyboardShortcuts: () => void;
  closeKeyboardShortcuts: () => void;
  
  openNewCollection: () => void;
  closeNewCollection: () => void;
  
  openSaveRequest: () => void;
  closeSaveRequest: () => void;
  
  openNewRequest: (collectionId?: string, folderId?: string) => void;
  closeNewRequest: () => void;
  
  closeAllDialogs: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  isSidebarOpen: true,
  isConsoleOpen: false,
  consoleHeight: 250,
  isEnvironmentManagerOpen: false,
  isKeyboardShortcutsOpen: false,
  isNewCollectionOpen: false,
  isSaveRequestOpen: false,
  isNewRequestOpen: false,
  newRequestContext: null,
  
  // Actions
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  toggleConsole: () => set((state) => ({ isConsoleOpen: !state.isConsoleOpen })),
  setConsoleOpen: (isOpen) => set({ isConsoleOpen: isOpen }),
  setConsoleHeight: (height) => set({ consoleHeight: height }),
  
  openEnvironmentManager: () => set({ isEnvironmentManagerOpen: true }),
  closeEnvironmentManager: () => set({ isEnvironmentManagerOpen: false }),
  
  openKeyboardShortcuts: () => set({ isKeyboardShortcutsOpen: true }),
  closeKeyboardShortcuts: () => set({ isKeyboardShortcutsOpen: false }),
  
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
    isEnvironmentManagerOpen: false,
    isKeyboardShortcutsOpen: false,
    isNewCollectionOpen: false,
    isSaveRequestOpen: false,
    isNewRequestOpen: false,
    newRequestContext: null,
  }),
}));
