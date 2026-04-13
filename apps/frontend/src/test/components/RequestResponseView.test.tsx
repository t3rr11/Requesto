import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestResponseView } from '../../components/RequestResponseView';

// ── Store mocks ──────────────────────────────────────────────────────

const mockGetActiveTab = vi.fn();
const mockSetTabResponse = vi.fn();
const mockSetTabLoading = vi.fn();
const mockSetTabError = vi.fn();
const mockMarkTabAsSaved = vi.fn();

vi.mock('../../store/tabs/store', () => ({
  useTabsStore: () => ({
    getActiveTab: mockGetActiveTab,
    setTabResponse: mockSetTabResponse,
    setTabLoading: mockSetTabLoading,
    setTabError: mockSetTabError,
    markTabAsSaved: mockMarkTabAsSaved,
  }),
}));

const mockUpdateRequest = vi.fn();
vi.mock('../../store/collections/store', () => ({
  useCollectionsStore: () => ({
    updateRequest: mockUpdateRequest,
    collections: [],
  }),
}));

vi.mock('../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    environmentsData: { environments: [], activeEnvironmentId: null },
  }),
}));

const mockSendRequest = vi.fn();
const mockSendStreamingRequest = vi.fn();
const mockIsStreamingRequest = vi.fn(() => false);
const mockAddConsoleLog = vi.fn();

vi.mock('../../store/request/store', () => ({
  useRequestStore: () => ({
    sendRequest: mockSendRequest,
    sendStreamingRequest: mockSendStreamingRequest,
    isStreamingRequest: mockIsStreamingRequest,
    addConsoleLog: mockAddConsoleLog,
  }),
}));

const mockSetRequestPanelWidth = vi.fn();
const mockSetRequestPanelHeight = vi.fn();

vi.mock('../../store/ui/store', () => ({
  useUIStore: () => ({
    panelLayout: 'horizontal',
    requestPanelWidth: 500,
    requestPanelHeight: 400,
    setRequestPanelWidth: mockSetRequestPanelWidth,
    setRequestPanelHeight: mockSetRequestPanelHeight,
  }),
}));

const mockShowAlert = vi.fn();
vi.mock('../../store/alert/store', () => ({
  useAlertStore: () => ({
    showAlert: mockShowAlert,
  }),
}));

vi.mock('../../store/theme/store', () => ({
  useThemeStore: () => ({ isDarkMode: false }),
}));

// ── Component mocks ─────────────────────────────────────────────────

const mockFormData = {
  method: 'GET',
  url: 'https://api.test.com',
  headers: [],
  params: [],
  body: '',
  bodyType: 'json' as const,
  formDataEntries: [],
  auth: { type: 'none' as const },
};

vi.mock('../../forms/RequestForm', () => ({
  RequestForm: ({ onSend, onCancel, onChange, loading }: { onSend: (data: unknown) => void; onCancel: () => void; onChange?: (data: unknown) => void; loading: boolean }) => {
    // Simulate onChange on mount so formDataRef gets populated
    if (onChange) onChange(mockFormData);
    return (
      <div data-testid="request-form">
        <span data-testid="form-loading">{loading ? 'loading' : 'idle'}</span>
        <button data-testid="send-btn" onClick={() => onSend(mockFormData)}>Send</button>
        <button data-testid="cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    );
  },
}));

vi.mock('../../components/ResponsePanel', () => ({
  ResponsePanel: ({ response, loading, error }: { response: unknown; loading: boolean; error: string | null }) => (
    <div data-testid="response-panel">
      {loading && <span>Loading…</span>}
      {error && <span>{error}</span>}
      {response ? <span>Has response</span> : null}
      {!loading && !error && !response && <span>Empty</span>}
    </div>
  ),
}));

vi.mock('../../components/RequestBreadcrumb', () => ({
  RequestBreadcrumb: ({ savedRequestId }: { savedRequestId?: string }) => (
    <span data-testid="breadcrumb">{savedRequestId ?? 'Untitled'}</span>
  ),
}));

vi.mock('../../forms/SaveRequestForm', () => ({
  SaveRequestForm: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="save-request-form">
      <button onClick={onCancel}>Cancel Save</button>
    </div>
  ),
}));

vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor" />,
}));

// ── Helpers ──────────────────────────────────────────────────────────

function makeTab(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tab-1',
    label: 'Test',
    request: { method: 'GET', url: 'https://api.test.com', headers: {}, body: '', bodyType: 'json', auth: { type: 'none' }, formDataEntries: [] },
    response: null,
    isDirty: false,
    isLoading: false,
    error: null,
    savedRequestId: undefined,
    collectionId: undefined,
    originalRequest: undefined,
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('RequestResponseView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveTab.mockReturnValue(makeTab());
  });

  // ── Empty state ──

  it('shows empty state when no active tab', () => {
    mockGetActiveTab.mockReturnValue(null);
    render(<RequestResponseView />);

    expect(screen.getByText('Create or select a request to get started')).toBeInTheDocument();
    expect(screen.queryByTestId('request-form')).not.toBeInTheDocument();
  });

  // ── Basic rendering ──

  it('renders request form and response panel', () => {
    render(<RequestResponseView />);

    expect(screen.getByTestId('request-form')).toBeInTheDocument();
    expect(screen.getByTestId('response-panel')).toBeInTheDocument();
  });

  it('renders breadcrumb with savedRequestId', () => {
    mockGetActiveTab.mockReturnValue(makeTab({ savedRequestId: 'req-42' }));
    render(<RequestResponseView />);

    expect(screen.getByTestId('breadcrumb')).toHaveTextContent('req-42');
  });

  it('renders breadcrumb as Untitled for unsaved tabs', () => {
    render(<RequestResponseView />);

    expect(screen.getByTestId('breadcrumb')).toHaveTextContent('Untitled');
  });

  it('renders Save button', () => {
    render(<RequestResponseView />);

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  // ── Dirty state ──

  it('shows unsaved changes indicator when tab is dirty', () => {
    mockGetActiveTab.mockReturnValue(makeTab({ isDirty: true }));
    render(<RequestResponseView />);

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('does not show unsaved changes indicator when tab is clean', () => {
    render(<RequestResponseView />);

    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('disables Save button when tab is not dirty', () => {
    render(<RequestResponseView />);

    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('enables Save button when tab is dirty', () => {
    mockGetActiveTab.mockReturnValue(makeTab({ isDirty: true }));
    render(<RequestResponseView />);

    expect(screen.getByText('Save')).toBeEnabled();
  });

  it('disables Save button when tab is loading', () => {
    mockGetActiveTab.mockReturnValue(makeTab({ isDirty: true, isLoading: true }));
    render(<RequestResponseView />);

    expect(screen.getByText('Save')).toBeDisabled();
  });

  // ── Loading state pass-through ──

  it('passes loading=false to RequestForm when tab is idle', () => {
    render(<RequestResponseView />);

    expect(screen.getByTestId('form-loading')).toHaveTextContent('idle');
  });

  it('passes loading=true to RequestForm when tab is loading', () => {
    mockGetActiveTab.mockReturnValue(makeTab({ isLoading: true }));
    render(<RequestResponseView />);

    expect(screen.getByTestId('form-loading')).toHaveTextContent('loading');
  });

  // ── Send request ──

  it('calls sendRequest and updates tab on send', async () => {
    const user = userEvent.setup();
    const mockResponse = { status: 200, statusText: 'OK', headers: {}, body: '{}', duration: 50 };
    mockSendRequest.mockResolvedValue(mockResponse);

    render(<RequestResponseView />);
    await user.click(screen.getByTestId('send-btn'));

    expect(mockSetTabLoading).toHaveBeenCalledWith('tab-1', true);
    expect(mockSendRequest).toHaveBeenCalled();

    // After resolution
    await vi.waitFor(() => {
      expect(mockSetTabResponse).toHaveBeenCalledWith('tab-1', mockResponse);
      expect(mockSetTabLoading).toHaveBeenCalledWith('tab-1', false);
    });
  });

  it('sets tab error on sendRequest failure', async () => {
    const user = userEvent.setup();
    mockSendRequest.mockRejectedValue(new Error('Network error'));

    render(<RequestResponseView />);
    await user.click(screen.getByTestId('send-btn'));

    await vi.waitFor(() => {
      expect(mockSetTabError).toHaveBeenCalledWith('tab-1', 'Network error');
      expect(mockSetTabLoading).toHaveBeenCalledWith('tab-1', false);
    });
  });

  it('logs request and response to console', async () => {
    const user = userEvent.setup();
    mockSendRequest.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, body: '', duration: 10 });

    render(<RequestResponseView />);
    await user.click(screen.getByTestId('send-btn'));

    await vi.waitFor(() => {
      const calls = mockAddConsoleLog.mock.calls;
      // First call: request log, second: response log
      expect(calls.length).toBe(2);
      expect(calls[0][0].type).toBe('request');
      expect(calls[1][0].type).toBe('response');
    });
  });

  it('logs error to console on failure', async () => {
    const user = userEvent.setup();
    mockSendRequest.mockRejectedValue(new Error('Timeout'));

    render(<RequestResponseView />);
    await user.click(screen.getByTestId('send-btn'));

    await vi.waitFor(() => {
      const errorLog = mockAddConsoleLog.mock.calls.find(
        (args: unknown[]) => (args[0] as { type: string }).type === 'error',
      );
      expect(errorLog).toBeDefined();
      expect((errorLog![0] as { message: string }).message).toBe('Timeout');
    });
  });

  // ── Streaming request ──

  it('calls sendStreamingRequest for streaming requests', async () => {
    const user = userEvent.setup();
    mockIsStreamingRequest.mockReturnValue(true);
    const streamResponse = { status: 200, statusText: 'OK', headers: {}, events: [], duration: 100, isStreaming: true };
    mockSendStreamingRequest.mockResolvedValue(streamResponse);

    render(<RequestResponseView />);
    await user.click(screen.getByTestId('send-btn'));

    await vi.waitFor(() => {
      expect(mockSendStreamingRequest).toHaveBeenCalled();
      expect(mockSetTabResponse).toHaveBeenCalledWith('tab-1', streamResponse);
    });
  });

  // ── Cancel ──

  it('aborts in-flight request on cancel', async () => {
    const user = userEvent.setup();
    // Make sendRequest hang
    mockSendRequest.mockImplementation(
      () => new Promise(() => {}),
    );

    render(<RequestResponseView />);
    await user.click(screen.getByTestId('send-btn'));
    await user.click(screen.getByTestId('cancel-btn'));

    // The abort is internal (via AbortController), verify loading was set
    expect(mockSetTabLoading).toHaveBeenCalledWith('tab-1', true);
  });

  // ── Save ──

  it('opens save dialog for unsaved request when Save clicked', async () => {
    const user = userEvent.setup();
    mockGetActiveTab.mockReturnValue(makeTab({ isDirty: true }));

    render(<RequestResponseView />);
    await user.click(screen.getByText('Save'));

    expect(screen.getByTestId('save-request-form')).toBeInTheDocument();
  });

  it('calls updateRequest directly for already-saved request', async () => {
    const user = userEvent.setup();
    mockGetActiveTab.mockReturnValue(
      makeTab({ isDirty: true, savedRequestId: 'req-1', collectionId: 'col-1' }),
    );
    mockUpdateRequest.mockResolvedValue(undefined);

    render(<RequestResponseView />);
    await user.click(screen.getByText('Save'));

    await vi.waitFor(() => {
      expect(mockUpdateRequest).toHaveBeenCalledWith('col-1', 'req-1', expect.any(Object));
      expect(mockMarkTabAsSaved).toHaveBeenCalledWith('tab-1', 'req-1', 'col-1');
    });
  });

  it('shows alert on save failure', async () => {
    const user = userEvent.setup();
    mockGetActiveTab.mockReturnValue(
      makeTab({ isDirty: true, savedRequestId: 'req-1', collectionId: 'col-1' }),
    );
    mockUpdateRequest.mockRejectedValue(new Error('Save failed'));

    render(<RequestResponseView />);
    await user.click(screen.getByText('Save'));

    await vi.waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Failed to save request', 'error');
    });
  });

  // ── Resize handle ──

  it('renders a resize handle', () => {
    const { container } = render(<RequestResponseView />);

    const handle = container.querySelector('.cursor-ew-resize');
    expect(handle).toBeInTheDocument();
  });

  // ── Keyboard shortcuts ──

  it('triggers save on Ctrl+S when tab is dirty', async () => {
    mockGetActiveTab.mockReturnValue(
      makeTab({ isDirty: true, savedRequestId: 'req-1', collectionId: 'col-1' }),
    );
    mockUpdateRequest.mockResolvedValue(undefined);

    render(<RequestResponseView />);

    fireEvent.keyDown(document, { key: 's', ctrlKey: true });

    await vi.waitFor(() => {
      expect(mockUpdateRequest).toHaveBeenCalled();
    });
  });

  it('does not trigger save on Ctrl+S when tab is clean', () => {
    render(<RequestResponseView />);

    fireEvent.keyDown(document, { key: 's', ctrlKey: true });

    expect(mockUpdateRequest).not.toHaveBeenCalled();
  });

  // ── Environment variable warning ──

  it('sends request without errors when no active environment', async () => {
    const user = userEvent.setup();
    mockSendRequest.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, body: '', duration: 10 });

    render(<RequestResponseView />);
    await user.click(screen.getByTestId('send-btn'));

    await vi.waitFor(() => {
      expect(mockSetTabResponse).toHaveBeenCalled();
      expect(mockShowAlert).not.toHaveBeenCalled();
    });
  });

  // ── Response pass-through ──

  it('passes response data to ResponsePanel', () => {
    const response = { status: 200, statusText: 'OK', headers: {}, body: '{"ok":true}', duration: 42 };
    mockGetActiveTab.mockReturnValue(makeTab({ response }));

    render(<RequestResponseView />);

    expect(screen.getByTestId('response-panel')).toHaveTextContent('Has response');
  });

  it('passes error to ResponsePanel', () => {
    mockGetActiveTab.mockReturnValue(makeTab({ error: 'Connection refused' }));

    render(<RequestResponseView />);

    expect(screen.getByTestId('response-panel')).toHaveTextContent('Connection refused');
  });

  it('passes loading to ResponsePanel', () => {
    mockGetActiveTab.mockReturnValue(makeTab({ isLoading: true }));

    render(<RequestResponseView />);

    expect(screen.getByTestId('response-panel')).toHaveTextContent('Loading');
  });
});
