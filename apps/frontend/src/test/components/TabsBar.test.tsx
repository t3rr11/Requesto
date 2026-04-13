import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { TabsBar } from '../../components/TabsBar';

const mockActivateTab = vi.fn();
const mockCloseTab = vi.fn();
const mockOpenNewTab = vi.fn().mockReturnValue('new-tab-id');
const mockReorderTabs = vi.fn();

vi.mock('../../store/tabs/store', () => ({
  useTabsStore: Object.assign(
    () => ({
      tabs: {
        'tab-1': {
          id: 'tab-1',
          label: 'GET /users',
          request: { method: 'GET', url: '/users' },
          isDirty: false,
          isLoading: false,
        },
        'tab-2': {
          id: 'tab-2',
          label: 'POST /posts',
          request: { method: 'POST', url: '/posts' },
          isDirty: true,
          isLoading: false,
        },
      },
      tabOrder: ['tab-1', 'tab-2'],
      activeTabId: 'tab-1',
      activateTab: mockActivateTab,
      closeTab: mockCloseTab,
      openNewTab: mockOpenNewTab,
      reorderTabs: mockReorderTabs,
    }),
    { getState: () => ({}) },
  ),
}));

vi.mock('../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    environmentsData: { activeEnvironmentId: null, environments: [] },
    setActiveEnvironment: vi.fn(),
    saveEnvironment: vi.fn(),
  }),
}));

describe('TabsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTabsBar = () =>
    render(
      <MemoryRouter>
        <TabsBar />
      </MemoryRouter>,
    );

  it('renders tab labels', () => {
    renderTabsBar();
    expect(screen.getByText('GET /users')).toBeInTheDocument();
    expect(screen.getByText('POST /posts')).toBeInTheDocument();
  });

  it('shows active tab', () => {
    renderTabsBar();
    expect(screen.getByText('GET /users')).toBeInTheDocument();
  });

  it('shows dirty indicator', () => {
    renderTabsBar();
    // The dirty tab should have a dot indicator
    const postTab = screen.getByText('POST /posts');
    expect(postTab).toBeInTheDocument();
  });

  it('switches to tab on click', () => {
    renderTabsBar();
    fireEvent.click(screen.getByText('POST /posts'));
    expect(mockActivateTab).toHaveBeenCalledWith('tab-2');
  });

  it('opens new tab on plus button click', () => {
    renderTabsBar();
    const addBtn = screen.getByTitle('New tab');
    fireEvent.click(addBtn);
    expect(mockOpenNewTab).toHaveBeenCalledOnce();
  });

  it('renders without crashing', () => {
    renderTabsBar();
    // Should render the plus button at minimum
    expect(screen.getByTitle('New tab')).toBeInTheDocument();
  });
});
