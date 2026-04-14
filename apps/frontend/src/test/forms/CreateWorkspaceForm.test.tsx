import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateWorkspaceForm } from '../../forms/CreateWorkspaceForm';

const mockCreateWorkspace = vi.fn().mockResolvedValue({ id: '1', name: 'Test' });
const mockCloneWorkspace = vi.fn().mockResolvedValue({ id: '2', name: 'Cloned' });
const mockShowAlert = vi.fn();

vi.mock('../../store/workspace/store', () => ({
  useWorkspaceStore: vi.fn(() => ({
    createWorkspace: mockCreateWorkspace,
    cloneWorkspace: mockCloneWorkspace,
  })),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: vi.fn(() => ({
    showAlert: mockShowAlert,
  })),
}));

describe('CreateWorkspaceForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clone from git repository/i)).toBeInTheDocument();
    expect(screen.getByText('Create Workspace')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('has autoFocus on name input', () => {
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    expect(screen.getByPlaceholderText('My Workspace')).toHaveFocus();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledOnce();
  });

  it('shows validation error for empty name on submit', async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Create Workspace'));
    expect(await screen.findByText('Workspace name is required')).toBeInTheDocument();
  });

  it('submits create workspace with valid name', async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/name/i), 'My Workspace');
    await user.click(screen.getByText('Create Workspace'));

    await vi.waitFor(() => {
      expect(mockCreateWorkspace).toHaveBeenCalledWith({ name: 'My Workspace' });
      expect(mockShowAlert).toHaveBeenCalledWith('Success', 'Workspace created successfully', 'success');
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });
  });

  it('shows clone fields when checkbox is toggled', async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Clone fields should not be visible initially
    expect(screen.queryByLabelText(/repository url/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/clone from git repository/i));

    // Clone fields should now be visible
    expect(screen.getByLabelText(/repository url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/access token/i)).toBeInTheDocument();
  });

  it('changes button text when clone is toggled', async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText('Create Workspace')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/clone from git repository/i));

    expect(screen.getByText('Clone & Create')).toBeInTheDocument();
  });

  it('shows validation error when clone is checked but repo URL is empty', async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/name/i), 'Test Workspace');
    await user.click(screen.getByLabelText(/clone from git repository/i));
    await user.click(screen.getByText('Clone & Create'));

    expect(await screen.findByText('Repository URL is required when cloning')).toBeInTheDocument();
  });

  it('submits clone workspace with repo URL', async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/name/i), 'Cloned Workspace');
    await user.click(screen.getByLabelText(/clone from git repository/i));
    await user.type(screen.getByLabelText(/repository url/i), 'https://github.com/user/repo.git');
    await user.click(screen.getByText('Clone & Create'));

    await vi.waitFor(() => {
      expect(mockCloneWorkspace).toHaveBeenCalledWith({
        name: 'Cloned Workspace',
        repoUrl: 'https://github.com/user/repo.git',
        authToken: undefined,
      });
      expect(mockShowAlert).toHaveBeenCalledWith('Success', 'Repository cloned and workspace created', 'success');
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });
  });

  it('passes auth token when provided for clone', async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/name/i), 'Private Repo');
    await user.click(screen.getByLabelText(/clone from git repository/i));
    await user.type(screen.getByLabelText(/repository url/i), 'https://github.com/user/private.git');
    await user.type(screen.getByLabelText(/access token/i), 'ghp_token123');
    await user.click(screen.getByText('Clone & Create'));

    await vi.waitFor(() => {
      expect(mockCloneWorkspace).toHaveBeenCalledWith({
        name: 'Private Repo',
        repoUrl: 'https://github.com/user/private.git',
        authToken: 'ghp_token123',
      });
    });
  });

  it('shows error alert on create failure', async () => {
    mockCreateWorkspace.mockRejectedValueOnce(new Error('Server error'));
    const user = userEvent.setup();
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/name/i), 'Failing Workspace');
    await user.click(screen.getByText('Create Workspace'));

    await vi.waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Server error', 'error');
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it('shows error alert on clone failure', async () => {
    mockCloneWorkspace.mockRejectedValueOnce(new Error('Clone failed'));
    const user = userEvent.setup();
    render(<CreateWorkspaceForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/name/i), 'Bad Clone');
    await user.click(screen.getByLabelText(/clone from git repository/i));
    await user.type(screen.getByLabelText(/repository url/i), 'https://bad-url.git');
    await user.click(screen.getByText('Clone & Create'));

    await vi.waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Clone failed', 'error');
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});
