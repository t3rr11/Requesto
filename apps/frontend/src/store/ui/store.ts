import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as actions from './actions';
import type { LayoutMode } from './types';

type UIState = {
  isSidebarOpen: boolean;
  sidebarWidth: number;
  requestPanelWidth: number;
  requestPanelHeight: number;
  panelLayout: LayoutMode;
  isConsoleOpen: boolean;
  consoleHeight: number;
  expandedCollections: Set<string>;
  expandedFolders: Set<string>;
  selectedRequestIds: Set<string>;
  lastSelectedRequestId: string | null;

  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setRequestPanelWidth: (width: number) => void;
  setRequestPanelHeight: (height: number) => void;
  togglePanelLayout: () => void;
  setPanelLayout: (layout: LayoutMode) => void;
  toggleConsole: () => void;
  setConsoleOpen: (isOpen: boolean) => void;
  setConsoleHeight: (height: number) => void;
  toggleCollection: (id: string) => void;
  toggleFolder: (id: string) => void;
  expandCollection: (id: string) => void;
  expandFolder: (id: string) => void;
  toggleRequestSelection: (requestId: string, ctrlKey: boolean, shiftKey: boolean, allRequestIds?: string[]) => void;
  clearSelection: () => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      sidebarWidth: 320,
      requestPanelWidth: 600,
      requestPanelHeight: 400,
      panelLayout: 'horizontal' as LayoutMode,
      isConsoleOpen: false,
      consoleHeight: 250,
      expandedCollections: new Set<string>(),
      expandedFolders: new Set<string>(),
      selectedRequestIds: new Set<string>(),
      lastSelectedRequestId: null,

      toggleSidebar: () => actions.toggleSidebar(set),
      setSidebarOpen: (isOpen) => actions.setSidebarOpen(set, isOpen),
      setSidebarWidth: (width) => actions.setSidebarWidth(set, width),
      setRequestPanelWidth: (width) => actions.setRequestPanelWidth(set, width),
      setRequestPanelHeight: (height) => actions.setRequestPanelHeight(set, height),
      togglePanelLayout: () => actions.togglePanelLayout(set),
      setPanelLayout: (layout) => actions.setPanelLayout(set, layout),
      toggleConsole: () => actions.toggleConsole(set),
      setConsoleOpen: (isOpen) => actions.setConsoleOpen(set, isOpen),
      setConsoleHeight: (height) => actions.setConsoleHeight(set, height),
      toggleCollection: (id) => actions.toggleCollection(set, id),
      toggleFolder: (id) => actions.toggleFolder(set, id),
      expandCollection: (id) => actions.expandCollection(set, id),
      expandFolder: (id) => actions.expandFolder(set, id),
      toggleRequestSelection: (requestId, ctrlKey, shiftKey, allRequestIds) =>
        actions.toggleRequestSelection(set, requestId, ctrlKey, shiftKey, allRequestIds),
      clearSelection: () => actions.clearSelection(set),
    }),
    {
      name: 'requesto-ui-storage',
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
              selectedRequestIds: new Set<string>(),
              lastSelectedRequestId: null,
            },
          };
        },
        setItem: (name, value) => {
          const { state } = value as { state: UIState };
          localStorage.setItem(
            name,
            JSON.stringify({
              state: {
                isSidebarOpen: state.isSidebarOpen,
                sidebarWidth: state.sidebarWidth,
                requestPanelWidth: state.requestPanelWidth,
                requestPanelHeight: state.requestPanelHeight,
                panelLayout: state.panelLayout,
                isConsoleOpen: state.isConsoleOpen,
                consoleHeight: state.consoleHeight,
                expandedCollections: Array.from(state.expandedCollections),
                expandedFolders: Array.from(state.expandedFolders),
              },
            }),
          );
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
);
