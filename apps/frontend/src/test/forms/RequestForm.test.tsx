import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestForm } from '../../forms/RequestForm';
import type { RequestFormData } from '../../forms/RequestForm';
// Mock Monaco editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="monaco-editor" value={value} onChange={e => onChange(e.target.value)} />
  ),
}));

// Mock VariableAwareInput
vi.mock('../../components/VariableAwareInput', () => ({
  VariableAwareInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="variable-aware-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

// Mock KeyValueEditor
vi.mock('../../components/KeyValueEditor', () => ({
  KeyValueEditor: ({
    items,
    onItemsChange,
  }: {
    items: Array<{ id: string; key: string; value: string; enabled: boolean }>;
    onItemsChange: (items: Array<{ id: string; key: string; value: string; enabled: boolean }>) => void;
  }) => (
    <div data-testid="key-value-editor">
      <span>{items.length} items</span>
      <button onClick={() => onItemsChange([...items, { id: 'new', key: '', value: '', enabled: true }])}>Add</button>
    </div>
  ),
}));

vi.mock('../../store/theme/store', () => ({
  useThemeStore: vi.fn(() => ({ isDarkMode: false })),
}));

vi.mock('../../store/tabs/store', () => ({
  useTabsStore: Object.assign(
    () => ({
      getActiveTab: () => ({
        id: 'tab-1',
        request: { method: 'GET', url: '', headers: {}, body: '', bodyType: 'json', auth: { type: 'none' }, formDataEntries: [] },
      }),
      updateTabRequest: vi.fn(),
    }),
    { getState: () => ({}) },
  ),
}));

function renderForm({ onSend, onCancel, loading = false }: { onSend?: (data: RequestFormData) => void; onCancel?: () => void; loading?: boolean } = {}) {
  return render(
    <RequestForm
      onSend={onSend ?? vi.fn()}
      onCancel={onCancel ?? vi.fn()}
      loading={loading}
    />,
  );
}

describe('RequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders method selector and URL input', () => {
    renderForm();

    // Method dropdown
    const methodSelect = screen.getByDisplayValue('GET');
    expect(methodSelect).toBeInTheDocument();

    // URL input
    expect(screen.getByTestId('variable-aware-input')).toBeInTheDocument();
  });

  it('renders Send button', () => {
    renderForm();

    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('shows loading state on Send button', () => {
    renderForm({ loading: true });

    // When loading, the button text changes to 'Cancel'
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
  });

  it('renders tab bar with all tabs', () => {
    renderForm();

    expect(screen.getByText(/params/i)).toBeInTheDocument();
    expect(screen.getByText(/auth/i)).toBeInTheDocument();
    expect(screen.getByText(/headers/i)).toBeInTheDocument();
    expect(screen.getByText(/body/i)).toBeInTheDocument();
  });

  it('switches to headers tab', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText(/headers/i));
    // Should show the KeyValueEditor for headers
    expect(screen.getAllByTestId('key-value-editor').length).toBeGreaterThanOrEqual(1);
  });

  it('switches to body tab and shows editor', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText(/body/i));
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('switches to auth tab', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText(/auth/i));
    // Auth tab shows the AuthEditor with auth type selector
    expect(screen.getByText(/Authentication Type/i)).toBeInTheDocument();
  });

  it('calls onSend when Send button is clicked', async () => {
    const mockSend = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSend: mockSend });

    // Need to set URL first because Send is disabled when URL is empty
    const urlInput = screen.getByTestId('variable-aware-input');
    await user.type(urlInput, 'https://api.example.com');

    await user.click(screen.getByText('Send'));
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('allows changing HTTP method', async () => {
    const user = userEvent.setup();
    renderForm();

    const methodSelect = screen.getByDisplayValue('GET');
    await user.selectOptions(methodSelect, 'POST');
    expect(methodSelect).toHaveValue('POST');
  });

  it('renders params tab by default with KeyValueEditor', () => {
    renderForm();

    // Params tab is default, should show KeyValueEditor
    expect(screen.getByTestId('key-value-editor')).toBeInTheDocument();
  });

  it('shows body type radio buttons in body tab', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText(/body/i));
    expect(screen.getByLabelText('JSON')).toBeInTheDocument();
    expect(screen.getByLabelText('Form Data')).toBeInTheDocument();
    expect(screen.getByLabelText('URL Encoded')).toBeInTheDocument();
  });

  it('shows monaco editor when JSON body type is selected', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText(/body/i));
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('switches to KeyValueEditor when Form Data is selected', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText(/body/i));
    await user.click(screen.getByLabelText('Form Data'));
    const editors = screen.getAllByTestId('key-value-editor');
    expect(editors.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
  });

  it('switches to KeyValueEditor when URL Encoded is selected', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText(/body/i));
    await user.click(screen.getByLabelText('URL Encoded'));
    // Body tab should now show a key-value editor (in addition to params)
    const editors = screen.getAllByTestId('key-value-editor');
    expect(editors.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
  });
});
