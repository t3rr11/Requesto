import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GitStatusBar } from '../../components/GitStatusBar';

const defaultGitState = {
  isRepo: false,
  branch: null,
  status: null,
  remotes: [],
};

vi.mock('../../store/git/store', () => ({
  useGitStore: vi.fn(() => defaultGitState),
}));

import { useGitStore } from '../../store/git/store';

describe('GitStatusBar', () => {
  const mockOnOpenGitPanel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGitStore).mockReturnValue(defaultGitState as any);
  });

  it('renders nothing when not a repo', () => {
    const { container } = render(<GitStatusBar onOpenGitPanel={mockOnOpenGitPanel} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders branch name when is a repo', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 0, behind: 0, files: [], isClean: true },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onOpenGitPanel={mockOnOpenGitPanel} />);
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('shows "no commits yet" when branch is null', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isRepo: true,
      branch: null,
      status: null,
      remotes: [],
    } as any);

    render(<GitStatusBar onOpenGitPanel={mockOnOpenGitPanel} />);
    expect(screen.getByText('no commits yet')).toBeInTheDocument();
  });

  it('shows changed file count when dirty', () => {
    vi.mocked(useGitStore).mockReturnValue({
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

    render(<GitStatusBar onOpenGitPanel={mockOnOpenGitPanel} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows ahead count', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 3, behind: 0, files: [], isClean: true },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onOpenGitPanel={mockOnOpenGitPanel} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows behind count', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 0, behind: 5, files: [], isClean: true },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onOpenGitPanel={mockOnOpenGitPanel} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onOpenGitPanel when clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    vi.mocked(useGitStore).mockReturnValue({
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 0, behind: 0, files: [], isClean: true },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onOpenGitPanel={mockOnOpenGitPanel} />);
    await user.click(screen.getByRole('button'));
    expect(mockOnOpenGitPanel).toHaveBeenCalledOnce();
  });

  it('shows tooltip with branch and status info', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isRepo: true,
      branch: 'develop',
      status: {
        branch: 'develop',
        ahead: 2,
        behind: 1,
        files: [{ path: 'a.json', index: 'M', workingDir: ' ' }],
        isClean: false,
      },
      remotes: [{ name: 'origin', fetchUrl: '', pushUrl: '' }],
    } as any);

    render(<GitStatusBar onOpenGitPanel={mockOnOpenGitPanel} />);

    const button = screen.getByRole('button');
    expect(button.title).toContain('Branch: develop');
    expect(button.title).toContain('1 changed file');
    expect(button.title).toContain('2 ahead');
    expect(button.title).toContain('1 behind');
  });

  it('shows no-remote indicator when no remotes configured', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isRepo: true,
      branch: 'main',
      status: { branch: 'main', ahead: 0, behind: 0, files: [], isClean: true },
      remotes: [],
    } as any);

    render(<GitStatusBar onOpenGitPanel={mockOnOpenGitPanel} />);

    const button = screen.getByRole('button');
    expect(button.title).toContain('No remote configured');
  });
});
