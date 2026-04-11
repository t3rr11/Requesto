import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCollectionsStore } from '../../store/collections/store';
import { NewRequestForm } from '../../forms/NewRequestForm';

const { mockCreateRequest } = vi.hoisted(() => ({
  mockCreateRequest: vi.fn(),
}));

vi.mock('../../store/collections/store', () => ({
  useCollectionsStore: vi.fn(() => ({
    collections: [
      { id: 'col-1', name: 'Auth API', folders: [{ id: 'f-1', name: 'Users' }], requests: [] },
      { id: 'col-2', name: 'Payment API', folders: [], requests: [] },
    ],
    createRequest: mockCreateRequest,
  })),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: vi.fn(() => ({
    showAlert: vi.fn(),
  })),
}));

describe('NewRequestForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRequest.mockResolvedValue({ id: 'req-1' });
    // Restore default store mock after tests that override it
    vi.mocked(useCollectionsStore).mockReturnValue({
      collections: [
        { id: 'col-1', name: 'Auth API', folders: [{ id: 'f-1', name: 'Users' }], requests: [] },
        { id: 'col-2', name: 'Payment API', folders: [], requests: [] },
      ],
      createRequest: mockCreateRequest,
    } as any);
  });

  it('renders form fields', () => {
    render(<NewRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/request name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/http method/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/collection/i)).toBeInTheDocument();
    expect(screen.getByText('Create Request')).toBeInTheDocument();
  });

  it('shows all HTTP methods', () => {
    render(<NewRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const methodSelect = screen.getByLabelText(/http method/i);
    expect(methodSelect).toBeInTheDocument();

    const options = methodSelect.querySelectorAll('option');
    expect(options).toHaveLength(7);
  });

  it('shows collections in dropdown', () => {
    render(<NewRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText('Auth API')).toBeInTheDocument();
    expect(screen.getByText('Payment API')).toBeInTheDocument();
  });

  it('shows folder dropdown when collection has folders', () => {
    render(<NewRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('-- Root Level --')).toBeInTheDocument();
  });

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup();
    render(<NewRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Create Request'));
    expect(await screen.findByText('Request name is required')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<NewRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledOnce();
  });

  it('shows warning when no collections', () => {
    vi.mocked(useCollectionsStore).mockReturnValue({
      collections: [],
      createRequest: mockCreateRequest,
    } as any);

    render(<NewRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    expect(screen.getByText(/no collections available/i)).toBeInTheDocument();
  });

  it('submits valid form', async () => {
    const user = userEvent.setup();
    render(<NewRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/request name/i), 'Get Users');
    await user.click(screen.getByText('Create Request'));

    await vi.waitFor(() => {
      expect(mockCreateRequest).toHaveBeenCalledOnce();
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });
  });
});
