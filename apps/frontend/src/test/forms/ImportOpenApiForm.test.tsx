import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportOpenApiForm } from '../../forms/ImportOpenApiForm';

const { mockImportOpenApi, mockShowAlert } = vi.hoisted(() => ({
  mockImportOpenApi: vi.fn(),
  mockShowAlert: vi.fn(),
}));

vi.mock('../../store/collections/store', () => ({
  useCollectionsStore: vi.fn(() => ({
    importOpenApiCollection: mockImportOpenApi,
  })),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: vi.fn(() => ({
    showAlert: mockShowAlert,
  })),
}));

describe('ImportOpenApiForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockImportOpenApi.mockResolvedValue({
      name: 'Pet Store API',
      requests: [{ id: 'r1' }, { id: 'r2' }],
    });
  });

  it('renders all form fields', () => {
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/spec source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/collection name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/keep linked/i)).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('link checkbox is checked by default', () => {
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('shows sync description when linked is checked', () => {
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(
      screen.getByText(/will stay connected to this spec/i),
    ).toBeInTheDocument();
  });

  it('hides sync description when linked is unchecked', async () => {
    const user = userEvent.setup();
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.click(screen.getByRole('checkbox'));

    expect(
      screen.queryByText(/will stay connected to this spec/i),
    ).not.toBeInTheDocument();
  });

  it('shows validation error when source is empty', async () => {
    const user = userEvent.setup();
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Import'));

    expect(await screen.findByText(/spec source is required/i)).toBeInTheDocument();
    expect(mockImportOpenApi).not.toHaveBeenCalled();
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/spec source/i), '/path/to/spec.json');
    await user.type(screen.getByLabelText(/collection name/i), 'My API');
    await user.click(screen.getByText('Import'));

    await vi.waitFor(() => {
      expect(mockImportOpenApi).toHaveBeenCalledWith({
        source: '/path/to/spec.json',
        name: 'My API',
        linkSpec: true,
      });
    });
  });

  it('calls onSuccess after successful import', async () => {
    const user = userEvent.setup();
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/spec source/i), 'https://example.com/spec.json');
    await user.click(screen.getByText('Import'));

    await vi.waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('shows success alert after import', async () => {
    const user = userEvent.setup();
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/spec source/i), 'https://example.com/spec.json');
    await user.click(screen.getByText('Import'));

    await vi.waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        'Success',
        expect.stringContaining('Imported "Pet Store API"'),
        'success',
      );
    });
  });

  it('shows error alert when import fails', async () => {
    mockImportOpenApi.mockRejectedValueOnce(new Error('Invalid spec'));
    const user = userEvent.setup();
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/spec source/i), '/bad/spec.json');
    await user.click(screen.getByText('Import'));

    await vi.waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Invalid spec', 'error');
    });
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('shows generic error message for non-Error throws', async () => {
    mockImportOpenApi.mockRejectedValueOnce('unknown');
    const user = userEvent.setup();
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/spec source/i), '/bad/spec.json');
    await user.click(screen.getByText('Import'));

    await vi.waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        'Error',
        'Failed to import OpenAPI spec',
        'error',
      );
    });
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Cancel'));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('submits with linkSpec false when unchecked', async () => {
    const user = userEvent.setup();
    render(<ImportOpenApiForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/spec source/i), '/path/to/spec.json');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('Import'));

    await vi.waitFor(() => {
      expect(mockImportOpenApi).toHaveBeenCalledWith(
        expect.objectContaining({ linkSpec: false }),
      );
    });
  });
});
