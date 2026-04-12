import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCollectionsStore } from '../../store/collections/store';
import { useTabsStore } from '../../store/tabs/store';
import { SaveRequestForm } from '../../forms/SaveRequestForm';

const { mockSaveRequest, mockSetActiveRequest, mockMarkTabAsSaved, mockUpdateTabLabel } = vi.hoisted(() => ({
  mockSaveRequest: vi.fn(),
  mockSetActiveRequest: vi.fn(),
  mockMarkTabAsSaved: vi.fn(),
  mockUpdateTabLabel: vi.fn(),
}));

vi.mock('../../store/collections/store', () => ({
  useCollectionsStore: vi.fn(() => ({
    collections: [
      { id: 'col-1', name: 'My API', folders: [], requests: [] },
      { id: 'col-2', name: 'Other API', folders: [], requests: [] },
    ],
    saveRequest: mockSaveRequest,
    setActiveRequest: mockSetActiveRequest,
  })),
}));

vi.mock('../../store/tabs/store', () => ({
  useTabsStore: vi.fn(() => ({
    markTabAsSaved: mockMarkTabAsSaved,
    updateTabLabel: mockUpdateTabLabel,
    activeTabId: 'tab-1',
  })),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: vi.fn(() => ({
    showAlert: vi.fn(),
  })),
}));

describe('SaveRequestForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const currentRequest = {
    method: 'GET',
    url: 'https://api.example.com/users',
    headers: { 'Content-Type': 'application/json' },
    body: '',
    bodyType: 'json' as const,
    formDataEntries: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveRequest.mockResolvedValue({ id: 'saved-1' });
    // Restore default store mock after tests that override it
    vi.mocked(useCollectionsStore).mockReturnValue({
      collections: [
        { id: 'col-1', name: 'My API', folders: [], requests: [] },
        { id: 'col-2', name: 'Other API', folders: [], requests: [] },
      ],
      saveRequest: mockSaveRequest,
      setActiveRequest: mockSetActiveRequest,
    } as any);
    vi.mocked(useTabsStore).mockReturnValue({
      markTabAsSaved: mockMarkTabAsSaved,
      updateTabLabel: mockUpdateTabLabel,
      activeTabId: 'tab-1',
    } as any);
  });

  it('renders form with auto-generated name', () => {
    render(
      <SaveRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} currentRequest={currentRequest} />,
    );

    expect(screen.getByLabelText(/request name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/collection/i)).toBeInTheDocument();
    expect(screen.getByText('Save Request')).toBeInTheDocument();
  });

  it('shows request preview', () => {
    render(
      <SaveRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} currentRequest={currentRequest} />,
    );

    expect(screen.getByText('Request Preview:')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText(/1 header/i)).toBeInTheDocument();
  });

  it('shows collections in dropdown', () => {
    render(
      <SaveRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} currentRequest={currentRequest} />,
    );

    expect(screen.getByText('My API')).toBeInTheDocument();
    expect(screen.getByText('Other API')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SaveRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} currentRequest={currentRequest} />,
    );

    await user.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledOnce();
  });

  it('shows warning when no collections', () => {
    vi.mocked(useCollectionsStore).mockReturnValue({
      collections: [],
      saveRequest: mockSaveRequest,
      setActiveRequest: mockSetActiveRequest,
    } as any);

    render(
      <SaveRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} currentRequest={currentRequest} />,
    );
    expect(screen.getByText(/no collections available/i)).toBeInTheDocument();
  });

  it('disables submit when currentRequest is null', () => {
    render(
      <SaveRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} currentRequest={null} />,
    );

    expect(screen.getByText('Save Request')).toBeDisabled();
  });

  it('submits and marks tab as saved', async () => {
    const user = userEvent.setup();
    render(
      <SaveRequestForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} currentRequest={currentRequest} />,
    );

    // Ensure name field has a value (auto-generated or manual)
    const nameInput = screen.getByLabelText(/request name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Get Users');

    await user.click(screen.getByText('Save Request'));

    await vi.waitFor(() => {
      expect(mockSaveRequest).toHaveBeenCalledOnce();
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });
  });
});
