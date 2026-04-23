import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewEnvironmentForm } from '../../forms/NewEnvironmentForm';

const mockAddEnvironment = vi.fn();
const mockSaveEnvironment = vi.fn();
const mockShowAlert = vi.fn();

vi.mock('../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    addEnvironment: mockAddEnvironment,
    saveEnvironment: mockSaveEnvironment,
  }),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: () => ({ showAlert: mockShowAlert }),
}));

describe('NewEnvironmentForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveEnvironment.mockResolvedValue(undefined);
  });

  it('renders the name input and action buttons', () => {
    render(<NewEnvironmentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows a validation error and does not call the store on empty submit', async () => {
    const user = userEvent.setup();
    render(<NewEnvironmentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    await user.click(screen.getByText('Create'));
    expect(await screen.findByText(/environment name is required/i)).toBeInTheDocument();
    expect(mockAddEnvironment).not.toHaveBeenCalled();
    expect(mockSaveEnvironment).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('creates the environment, persists it, and reports success with the new id', async () => {
    const user = userEvent.setup();
    render(<NewEnvironmentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    await user.type(screen.getByLabelText(/name/i), 'Production');
    await user.click(screen.getByText('Create'));

    await vi.waitFor(() => {
      expect(mockAddEnvironment).toHaveBeenCalledOnce();
      expect(mockSaveEnvironment).toHaveBeenCalledOnce();
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });

    const created = mockAddEnvironment.mock.calls[0][0];
    expect(created.name).toBe('Production');
    expect(typeof created.id).toBe('string');
    expect(mockOnSuccess).toHaveBeenCalledWith(created.id);
    expect(mockShowAlert).toHaveBeenCalledWith('Success', 'Environment created', 'success');
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<NewEnvironmentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    await user.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledOnce();
    expect(mockAddEnvironment).not.toHaveBeenCalled();
  });
});
