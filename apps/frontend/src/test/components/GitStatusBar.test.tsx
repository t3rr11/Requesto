import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GitStatusBar } from '../../components/GitStatusBar';

const mockPush = vi.fn().mockResolvedValue(undefined);
const mockPull = vi.fn().mockResolvedValue({ conflicts: [], message: 'ok' });
const mockLoadStatus = vi.fn().mockResolvedValue(undefined);

const defaultGitState = {
  isRepo: false,
  branch: null,
  status: null,
  remotes: [],
  pushing: false,
  pulling: false,
  statusLoading: false,
  push: mockPush,
  pull: mockPull,
  loadStatus: mockLoadStatus,
};

vi.mock('../../store/git/store', () => ({
  useGitStore: vi.fn(() => defaultGitState),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: vi.fn(() => ({ showAlert: vi.fn() })),
}));

import { useGitStore } from '../../store/git/store';

describe('GitStatusBar', () => {
  const mockOnTogglePanel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGitStore).mockReturnValue(defaultGitState as any);
  });

  it('renders nothing when not a repo', () => {
    const { container } = render(<GitStatusBar onTogglePanel={mockOnTogglePanel} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders branch name when is a repo', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...defaultGitState,
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 0, behind: 0, files: [], isClean: true },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onTogglePanel={mockOnTogglePanel} />);
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('shows "no commits yet" when branch is null', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...defaultGitState,
      isRepo: true,
      branch: null,
      status: null,
      remotes: [],
    } as any);

    render(<GitStatusBar onTogglePanel={mockOnTogglePanel} />);
    expect(screen.getByText('no commits yet')).toBeInTheDocument();
  });

  it('shows changed file count when dirty', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...defaultGitState,
      isRepo: true,
      branch: 'main',
      status: {
        branch: 'main',
        ahead: 0,
        behind: 0,
        files: [{ path: 'a.json', index: 'M', workingDir: ' ' }, { path: 'b.json', index: 'A', workingDir: ' ' }],
        isClean: false,
      },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onTogglePanel={mockOnTogglePanel} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows ahead count', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...defaultGitState,
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 3, behind: 0, files: [], isClean: true },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onTogglePanel={mockOnTogglePanel} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows behind count', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...defaultGitState,
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 0, behind: 5, files: [], isClean: true },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onTogglePanel={mockOnTogglePanel} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onTogglePanel when status area clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    vi.mocked(useGitStore).mockReturnValue({
      ...defaultGitState,
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 0, behind: 0, files: [], isClean: true },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onTogglePanel={mockOnTogglePanel} />);
    // Click the main status area button (first button)
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(mockOnTogglePanel).toHaveBeenCalledOnce();
  });

  it('shows push/pull buttons when remote is configured', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...defaultGitState,
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 0, behind: 0, files: [], isClean: true },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onTogglePanel={mockOnTogglePanel} />);
    expect(screen.getByTitle('Pull')).toBeInTheDocument();
    expect(screen.getByTitle('Push')).toBeInTheDocument();
  });

  it('shows no-remote indicator when no remotes configured', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...defaultGitState,
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 0, behind: 0, files: [], isClean: true },
      remotes: [],
    } as any);

    render(<GitStatusBar onTogglePanel={mockOnTogglePanel} />);

    // No push/pull buttons when no remote
    expect(screen.queryByTitle('Pull')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Push')).not.toBeInTheDocument();
  });
});
