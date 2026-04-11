import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Header } from '../../components/Header';

const mockToggleSidebar = vi.fn();
const mockToggleConsole = vi.fn();
const mockTogglePanelLayout = vi.fn();
vi.mock('../../store/ui/store', () => ({
  useUIStore: () => ({
    isSidebarOpen: true,
    isConsoleOpen: false,
    panelLayout: 'vertical',
    toggleSidebar: mockToggleSidebar,
    toggleConsole: mockToggleConsole,
    togglePanelLayout: mockTogglePanelLayout,
  }),
}));

const mockToggleTheme = vi.fn();
vi.mock('../../store/theme/store', () => ({
  useThemeStore: () => ({
    isDarkMode: false,
    toggleTheme: mockToggleTheme,
  }),
}));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderHeader = (path = '/') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Header />
      </MemoryRouter>,
    );

  it('renders app name', () => {
    renderHeader();
    expect(screen.getByText('Requesto')).toBeInTheDocument();
  });

  it('toggles sidebar on button click', () => {
    renderHeader();
    const sidebarBtn = screen.getByTitle('Hide Sidebar');
    fireEvent.click(sidebarBtn);
    expect(mockToggleSidebar).toHaveBeenCalledOnce();
  });

  it('toggles theme on button click', () => {
    renderHeader();
    const themeBtn = screen.getByTitle('Switch to Dark Mode');
    fireEvent.click(themeBtn);
    expect(mockToggleTheme).toHaveBeenCalledOnce();
  });

  it('toggles console on button click', () => {
    renderHeader();
    const consoleBtn = screen.getByTitle('Show Console');
    fireEvent.click(consoleBtn);
    expect(mockToggleConsole).toHaveBeenCalledOnce();
  });

  it('toggles panel layout on button click', () => {
    renderHeader();
    const layoutBtn = screen.getByTitle('Switch to Horizontal Layout');
    fireEvent.click(layoutBtn);
    expect(mockTogglePanelLayout).toHaveBeenCalledOnce();
  });

  it('opens help dialog', () => {
    renderHeader();
    const helpBtn = screen.getByTitle('Help');
    fireEvent.click(helpBtn);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });
});
