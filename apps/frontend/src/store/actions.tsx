import { AppState, AppActions, EnvironmentsData, Collection, SavedRequest, ConsoleLog, Folder, RequestCache } from './types';
import { ProxyResponse } from '../types';

export const createAppActions = (set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void): AppActions => ({
  // Request actions
  setResponse: (response: ProxyResponse | null) =>
    set({ response }),

  setLoading: (loading: boolean) =>
    set({ loading }),

  setError: (error: string | null) =>
    set({ error }),

  // UI actions
  setIsSidebarOpen: (isOpen: boolean) =>
    set({ isSidebarOpen: isOpen }),

  toggleSidebar: () =>
    set((state: AppState) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setIsConsoleOpen: (isOpen: boolean) =>
    set({ isConsoleOpen: isOpen }),

  toggleConsole: () =>
    set((state: AppState) => ({ isConsoleOpen: !state.isConsoleOpen })),

  setConsoleHeight: (height: number) =>
    set({ consoleHeight: height }),

  setIsEnvironmentManagerOpen: (isOpen: boolean) =>
    set({ isEnvironmentManagerOpen: isOpen }),

  setIsKeyboardShortcutsOpen: (isOpen: boolean) =>
    set({ isKeyboardShortcutsOpen: isOpen }),

  // Environment actions
  setEnvironmentsData: (data: EnvironmentsData) =>
    set({ environmentsData: data }),

  incrementEnvironmentCounter: () =>
    set((state: AppState) => ({ environmentChangeCounter: state.environmentChangeCounter + 1 })),

  // Collections actions
  setCollections: (collections: Collection[]) =>
    set({ collections }),

  addCollection: (collection: Collection) =>
    set((state: AppState) => ({ collections: [...state.collections, collection] })),

  updateCollection: (id: string, updates: Partial<Collection>) =>
    set((state: AppState) => ({
      collections: state.collections.map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    })),

  deleteCollection: (id: string) =>
    set((state: AppState) => ({
      collections: state.collections.filter(c => c.id !== id),
      activeCollectionId: state.activeCollectionId === id ? null : state.activeCollectionId,
    })),

  setActiveCollection: (id: string | null) =>
    set({ activeCollectionId: id }),

  setActiveRequest: (id: string | null) =>
    set({ activeRequestId: id }),

  addRequestToCollection: (collectionId: string, request: SavedRequest) =>
    set((state: AppState) => ({
      collections: state.collections.map(c =>
        c.id === collectionId
          ? { ...c, requests: [...c.requests, request], updatedAt: Date.now() }
          : c
      ),
    })),

  updateRequest: (collectionId: string, requestId: string, updates: Partial<SavedRequest>) =>
    set((state: AppState) => ({
      collections: state.collections.map(c =>
        c.id === collectionId
          ? {
              ...c,
              requests: c.requests.map(r =>
                r.id === requestId ? { ...r, ...updates, updatedAt: Date.now() } : r
              ),
              updatedAt: Date.now(),
            }
          : c
      ),
    })),

  deleteRequest: (collectionId: string, requestId: string) =>
    set((state: AppState) => ({
      collections: state.collections.map(c =>
        c.id === collectionId
          ? {
              ...c,
              requests: c.requests.filter(r => r.id !== requestId),
              updatedAt: Date.now(),
            }
          : c
      ),
      activeRequestId: state.activeRequestId === requestId ? null : state.activeRequestId,
    })),

  // Folder actions
  addFolder: (collectionId: string, folder: Folder) =>
    set((state: AppState) => ({
      collections: state.collections.map(c =>
        c.id === collectionId
          ? { ...c, folders: [...(c.folders || []), folder], updatedAt: Date.now() }
          : c
      ),
    })),

  updateFolder: (collectionId: string, folderId: string, updates: Partial<Folder>) =>
    set((state: AppState) => ({
      collections: state.collections.map(c =>
        c.id === collectionId
          ? {
              ...c,
              folders: (c.folders || []).map(f =>
                f.id === folderId ? { ...f, ...updates, updatedAt: Date.now() } : f
              ),
              updatedAt: Date.now(),
            }
          : c
      ),
    })),

  deleteFolder: (collectionId: string, folderId: string) =>
    set((state: AppState) => ({
      collections: state.collections.map(c =>
        c.id === collectionId
          ? {
              ...c,
              folders: (c.folders || []).filter(f => f.id !== folderId && f.parentId !== folderId),
              requests: c.requests.filter(r => r.folderId !== folderId),
              updatedAt: Date.now(),
            }
          : c
      ),
    })),

  // Request cache actions
  setRequestCache: (requestId: string, cache: RequestCache) =>
    set((state: AppState) => {
      const newCache = new Map(state.requestCache);
      newCache.set(requestId, cache);
      return { requestCache: newCache };
    }),

  getRequestCache: (_requestId: string) => {
    // This is a getter, implemented differently
    return undefined; // Will be overridden in the store
  },

  clearRequestCache: () =>
    set({ requestCache: new Map() }),

  // Console actions
  addConsoleLog: (log: Omit<ConsoleLog, 'id' | 'timestamp'>) =>
    set((state: AppState) => ({
      consoleLogs: [
        ...state.consoleLogs,
        {
          ...log,
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
        },
      ].slice(-100), // Keep only last 100 logs
    })),

  clearConsoleLogs: () =>
    set({ consoleLogs: [] }),
});
