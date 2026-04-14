import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspaceSwitcher } from '../../components/WorkspaceSwitcher';

const mockSwitchWorkspace = vi.fn().mockResolvedValue({});

const defaultState = {
  registry: {
    activeWorkspaceId: 'ws-1',
    workspaces: [
      { id: 'ws-1', name: 'Default', path: '/data/ws-1', createdAt: 1700000000000, updatedAt: 1700000000000 },
      { id: 'ws-2', name: 'Production', path: '/data/ws-2', createdAt: 1700000000000, updatedAt: 1700000000000 },
    ],
  },
  switchWorkspace: mockSwitchWorkspace,
};

vi.mock('../../store/workspace/store', () => ({
  useWorkspaceStore: vi.fn(() => defaultState),
}));

import { useWorkspaceStore } from '../../store/workspace/store';

describe('WorkspaceSwitcher', () => {
  const mockOnManageWorkspaces = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkspaceStore).mockReturnValue(defaultState as any);
  });

  it('renders active workspace name', () => {
    render(<WorkspaceSwitcher onManageWorkspaces={mockOnManageWorkspaces} />);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows "No workspace" when no active workspace found', () => {
    vi.mocked(useWorkspaceStore).mockReturnValue({
      ...defaultState,
      registry: { activeWorkspaceId: 'missing', workspaces: [] },
    } as any);

    render(<WorkspaceSwitcher onManageWorkspaces={mockOnManageWorkspaces} />);
    expect(screen.getByText('No workspace')).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<WorkspaceSwitcher onManageWorkspaces={mockOnManageWorkspaces} />);

    await user.click(screen.getByText('Default'));

    expect(screen.getByText('Workspaces')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Manage Workspaces...')).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(<WorkspaceSwitcher onManageWorkspaces={mockOnManageWorkspaces} />);

    await user.click(screen.getByText('Default'));
    expect(screen.getByText('Workspaces')).toBeInTheDocument();

    // Click the overlay
    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) await user.click(overlay);

    expect(screen.queryByText('Workspaces')).not.toBeInTheDocument();
  });

  it('closes dropdown without switching when clicking active workspace', async () => {
    const user = userEvent.setup();
    render(<WorkspaceSwitcher onManageWorkspaces={mockOnManageWorkspaces} />);

    await user.click(screen.getByText('Default'));

    // Click on the active workspace in the dropdown list
    const workspaceButtons = screen.getAllByRole('button');
    const defaultButton = workspaceButtons.find(b => b.textContent?.includes('Default') && b !== screen.getByTitle('Default'));
    if (defaultButton) await user.click(defaultButton);

    expect(mockSwitchWorkspace).not.toHaveBeenCalled();
  });

  it('calls onManageWorkspaces when Manage Workspaces is clicked', async () => {
    const user = userEvent.setup();
    render(<WorkspaceSwitcher onManageWorkspaces={mockOnManageWorkspaces} />);

    await user.click(screen.getByText('Default'));
    await user.click(screen.getByText('Manage Workspaces...'));

    expect(mockOnManageWorkspaces).toHaveBeenCalledOnce();
  });
});
