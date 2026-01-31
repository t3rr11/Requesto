import { create } from 'zustand';
import { AppState, AppActions } from './types';
import { createAppActions } from './actions';

const initialState: AppState = {
  response: null,
  loading: false,
  error: null,
  isSidebarOpen: true,
  isConsoleOpen: false,
  consoleHeight: 250,
  isEnvironmentManagerOpen: false,
  isKeyboardShortcutsOpen: false,
  environmentsData: {
    activeEnvironmentId: null,
    environments: [],
  },
  environmentChangeCounter: 0,
  collections: [],
  activeCollectionId: null,
  activeRequestId: null,
  requestCache: new Map(),
  consoleLogs: [],
};

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,
  ...createAppActions(set),
  // Override getRequestCache to actually read from state
  getRequestCache: (requestId: string) => {
    return get().requestCache.get(requestId);
  },
}));
