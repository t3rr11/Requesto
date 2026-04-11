import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewCollectionForm } from '../../forms/NewCollectionForm';

vi.mock('../../store/collections/store', () => ({
  useCollectionsStore: vi.fn(() => ({
    createCollection: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
  })),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: vi.fn(() => ({
    showAlert: vi.fn(),
  })),
}));

describe('NewCollectionForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<NewCollectionForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByText('Create Collection')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<NewCollectionForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledOnce();
  });

  it('shows validation error for empty name on submit', async () => {
    const user = userEvent.setup();
    render(<NewCollectionForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Create Collection'));
    expect(await screen.findByText('Collection name is required')).toBeInTheDocument();
  });

  it('submits with valid data', async () => {
    const user = userEvent.setup();
    render(<NewCollectionForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/name/i), 'My Collection');
    await user.click(screen.getByText('Create Collection'));

    // After successful submit, onSuccess should be called
    await vi.waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });
  });

  it('has autoFocus on name input', () => {
    render(<NewCollectionForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    expect(screen.getByPlaceholderText('My API Collection')).toHaveFocus();
  });
});
