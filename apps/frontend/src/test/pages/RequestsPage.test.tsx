import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { RequestsPage } from '../../pages/RequestsPage';

// Mock all the stores used by RequestsPage and its children
vi.mock('../../store/collections/store', () => ({
  useCollectionsStore: Object.assign(
    () => ({
      collections: [],
      loading: false,
      loadCollections: vi.fn(),
      importCollection: vi.fn(),
      updateCollection: vi.fn(),
      updateRequest: vi.fn(),
      updateFolder: vi.fn(),
    }),
    { getState: () => ({ collections: [] }) },
  ),
}));

vi.mock('../../store/request/store', () => ({
  useRequestStore: Object.assign(
    () => ({
      response: null,
      loading: false,
      error: null,
      consoleLogs: [],
      sendRequest: vi.fn(),
      sendStreamingRequest: vi.fn(),
      isStreamingRequest: vi.fn().mockReturnValue(false),
      addConsoleLog: vi.fn(),
      clearConsoleLogs: vi.fn(),
      setResponse: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    }),
    { getState: () => ({}) },
  ),
}));

vi.mock('../../store/tabs/store', () => ({
  useTabsStore: Object.assign(
    () => ({
      tabs: {},
      tabOrder: [],
      activeTabId: null,
      openNewTab: vi.fn(),
      activateTab: vi.fn(),
      closeTab: vi.fn(),
      getActiveTab: () => null,
      getTabBySavedRequestId: () => null,
      reorderTabs: vi.fn(),
      updateTabRequest: vi.fn(),
      setTabResponse: vi.fn(),
      setTabLoading: vi.fn(),
      setTabError: vi.fn(),
      markTabAsSaved: vi.fn(),
      updateTabLabel: vi.fn(),
    }),
    { getState: () => ({ tabs: {}, tabOrder: [], activeTabId: null, getActiveTab: () => null }) },
  ),
}));

vi.mock('../../store/ui/store', () => ({
  useUIStore: Object.assign(
    () => ({
      isSidebarOpen: false,
      sidebarWidth: 280,
      isConsoleOpen: false,
      consoleHeight: 200,
      panelLayout: 'vertical',
      requestPanelWidth: 50,
      requestPanelHeight: 50,
      expandedCollections: new Set(),
      expandedFolders: new Set(),
      selectedRequestIds: new Set(),
      lastSelectedRequestId: null,
      toggleSidebar: vi.fn(),
      toggleConsole: vi.fn(),
      setConsoleHeight: vi.fn(),
      setSidebarWidth: vi.fn(),
      setRequestPanelWidth: vi.fn(),
      setRequestPanelHeight: vi.fn(),
      toggleCollection: vi.fn(),
      toggleFolder: vi.fn(),
      expandCollection: vi.fn(),
      expandFolder: vi.fn(),
      toggleRequestSelection: vi.fn(),
      clearSelection: vi.fn(),
    }),
    { getState: () => ({ selectedRequestIds: new Set() }) },
  ),
}));

vi.mock('../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    environmentsData: { activeEnvironmentId: null, environments: [] },
    setActiveEnvironment: vi.fn(),
    saveEnvironment: vi.fn(),
  }),
}));

vi.mock('../../store/theme/store', () => ({
  useThemeStore: () => ({
    isDarkMode: false,
  }),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: () => ({
    showAlert: vi.fn(),
  }),
}));

vi.mock('../../store/oauth/store', () => ({
  useOAuthStore: () => ({
    configs: [],
    tokenState: {},
    loadConfigs: vi.fn(),
  }),
}));

describe('RequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>,
    );
    // Should show the empty state since no active tab
    expect(screen.getByText('Create or select a request to get started')).toBeInTheDocument();
  });

  it('renders the page structure', () => {
    const { container } = render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>,
    );
    // Should have the main layout
    expect(container.querySelector('.flex')).toBeInTheDocument();
  });
});
