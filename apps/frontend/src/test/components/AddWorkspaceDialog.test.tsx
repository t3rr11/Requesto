import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddWorkspaceDialog } from '../../components/AddWorkspaceDialog';

const mockCreateWorkspace = vi.fn().mockResolvedValue({ id: 'ws-new', name: 'Created' });
const mockCloneWorkspace = vi.fn().mockResolvedValue({ id: 'ws-clone', name: 'Cloned' });
const mockOpenWorkspace = vi.fn().mockResolvedValue({ id: 'ws-open', name: 'Opened' });
const mockImportWorkspace = vi.fn().mockResolvedValue({ id: 'ws-import', name: 'Imported' });
const mockSwitchWorkspace = vi.fn().mockResolvedValue({});
const mockShowAlert = vi.fn();

vi.mock('../../store/workspace/store', () => ({
  useWorkspaceStore: vi.fn(() => ({
    createWorkspace: mockCreateWorkspace,
    cloneWorkspace: mockCloneWorkspace,
    openWorkspace: mockOpenWorkspace,
    importWorkspace: mockImportWorkspace,
    switchWorkspace: mockSwitchWorkspace,
  })),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: vi.fn(() => ({ showAlert: mockShowAlert })),
}));

import { useWorkspaceStore } from '../../store/workspace/store';

function inspectResponse(result: Record<string, unknown>): Response {
  return {
    ok: true,
    json: () => Promise.resolve(result),
  } as unknown as Response;
}

const foundPreview = {
  exists: true,
  isDirectory: true,
  hasRequestoData: true,
  isGitRepo: true,
  counts: { collections: 3, environments: 2, oauthConfigs: 1 },
  suggestedName: 'project-a',
};

describe('AddWorkspaceDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkspaceStore).mockReturnValue({
      createWorkspace: mockCreateWorkspace,
      cloneWorkspace: mockCloneWorkspace,
      openWorkspace: mockOpenWorkspace,
      importWorkspace: mockImportWorkspace,
      switchWorkspace: mockSwitchWorkspace,
    } as any);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(inspectResponse(foundPreview)),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the four mode cards', () => {
    render(<AddWorkspaceDialog isOpen onClose={mockOnClose} />);

    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Open Folder')).toBeInTheDocument();
    expect(screen.getByText('Clone from Git')).toBeInTheDocument();
    expect(screen.getByText('Import File')).toBeInTheDocument();
  });

  it('opens in the requested initial mode', () => {
    render(<AddWorkspaceDialog isOpen onClose={mockOnClose} initialMode="clone" />);

    expect(screen.getByLabelText(/Repository URL/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Access Token/)).toBeInTheDocument();
  });

  it('creates a workspace, switches to it, and closes', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog isOpen onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/^Name/), 'My Workspace');
    await user.click(screen.getByRole('button', { name: 'Create Workspace' }));

    await waitFor(() => {
      expect(mockCreateWorkspace).toHaveBeenCalledWith({ name: 'My Workspace' });
    });
    expect(mockSwitchWorkspace).toHaveBeenCalledWith('ws-new');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows a validation error when creating without a name', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog isOpen onClose={mockOnClose} />);

    await user.click(screen.getByRole('button', { name: 'Create Workspace' }));

    expect(await screen.findByText('Workspace name is required')).toBeInTheDocument();
    expect(mockCreateWorkspace).not.toHaveBeenCalled();
  });

  it('previews a folder when a path is typed in web mode', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog isOpen onClose={mockOnClose} initialMode="open" />);

    await user.type(screen.getByLabelText(/^Folder/), '/home/user/project-a');

    await waitFor(
      () => {
        expect(screen.getByTestId('workspace-folder-preview')).toHaveTextContent(
          'Requesto workspace found',
        );
      },
      { timeout: 3000 },
    );
    expect(screen.getByTestId('workspace-folder-preview')).toHaveTextContent('3 collections');
    // Name is suggested from the folder
    expect(screen.getByLabelText(/^Name/)).toHaveValue('project-a');
  });

  it('shows a hint when the inspected folder has no Requesto data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        inspectResponse({
          exists: true,
          isDirectory: true,
          hasRequestoData: false,
          isGitRepo: false,
          counts: { collections: 0, environments: 0, oauthConfigs: 0 },
          suggestedName: 'empty-dir',
        }),
      ),
    );

    const user = userEvent.setup();
    render(<AddWorkspaceDialog isOpen onClose={mockOnClose} initialMode="open" />);

    await user.type(screen.getByLabelText(/^Folder/), '/home/user/empty-dir');

    await waitFor(
      () => {
        expect(screen.getByTestId('workspace-folder-preview')).toHaveTextContent(
          'No Requesto data here yet',
        );
      },
      { timeout: 3000 },
    );
  });

  it('submits open mode with the typed path', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog isOpen onClose={mockOnClose} initialMode="open" />);

    await user.type(screen.getByLabelText(/^Name/), 'My Project');
    await user.type(screen.getByLabelText(/^Folder/), '/home/user/project-a');
    await user.click(screen.getByRole('button', { name: 'Add Workspace' }));

    await waitFor(() => {
      expect(mockOpenWorkspace).toHaveBeenCalledWith({
        name: 'My Project',
        path: '/home/user/project-a',
      });
    });
    expect(mockSwitchWorkspace).toHaveBeenCalledWith('ws-open');
  });

  it('clones a repository with an optional token', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog isOpen onClose={mockOnClose} initialMode="clone" />);

    await user.type(screen.getByLabelText(/^Name/), 'Shared Collection');
    await user.type(screen.getByLabelText(/Repository URL/), 'https://github.com/user/repo.git');
    await user.click(screen.getByRole('button', { name: 'Clone & Create' }));

    await waitFor(() => {
      expect(mockCloneWorkspace).toHaveBeenCalledWith({
        name: 'Shared Collection',
        repoUrl: 'https://github.com/user/repo.git',
        authToken: undefined,
      });
    });
  });

  it('imports a workspace bundle file', async () => {
    const user = userEvent.setup();
    render(<AddWorkspaceDialog isOpen onClose={mockOnClose} initialMode="import" />);

    const importButton = screen.getByRole('button', { name: 'Import' });
    expect(importButton).toBeDisabled();

    const file = new File(['{"name":"Bundle"}'], 'bundle.json', { type: 'application/json' });
    const fileInput = screen.getByLabelText(/Workspace bundle/) as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(importButton).toBeEnabled();
    await user.click(importButton);

    await waitFor(() => {
      expect(mockImportWorkspace).toHaveBeenCalledOnce();
    });
    expect(mockSwitchWorkspace).toHaveBeenCalledWith('ws-import');
  });
});
