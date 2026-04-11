import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RequestForm, requestFormSchema } from '../../forms/RequestForm';
import type { RequestFormData } from '../../forms/RequestForm';
import type { AuthConfig } from '../../store/request/types';
import type { PropsWithChildren } from 'react';

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
      <button onClick={() => onItemsChange([...items, { id: 'new', key: '', value: '', enabled: true }])}>
        Add
      </button>
    </div>
  ),
}));

vi.mock('../../store/theme/store', () => ({
  useThemeStore: vi.fn(() => ({ isDarkMode: false })),
}));

const defaultValues: RequestFormData = {
  method: 'GET',
  url: '',
  headers: [],
  params: [],
  body: '',
  auth: { type: 'none' },
};

function Wrapper({
  children,
  onSend,
  loading = false,
}: PropsWithChildren<{ onSend?: () => void; loading?: boolean }>) {
  const methods = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <RequestForm
        control={methods.control}
        onSend={onSend ?? vi.fn()}
        loading={loading}
        urlValue={methods.watch('url')}
        headers={methods.watch('headers')}
        onHeadersChange={(val: RequestFormData['headers']) => methods.setValue('headers', val)}
        params={methods.watch('params')}
        onParamsChange={(val: RequestFormData['params']) => methods.setValue('params', val)}
        onUrlChange={(val: string) => methods.setValue('url', val)}
        auth={methods.watch('auth') as AuthConfig}
        onAuthChange={(val: AuthConfig) => methods.setValue('auth', val)}
      />
      {children}
    </FormProvider>
  );
}

describe('RequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders method selector and URL input', () => {
    render(<Wrapper />);

    // Method dropdown
    const methodSelect = screen.getByDisplayValue('GET');
    expect(methodSelect).toBeInTheDocument();

    // URL input
    expect(screen.getByTestId('variable-aware-input')).toBeInTheDocument();
  });

  it('renders Send button', () => {
    render(<Wrapper />);

    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('shows loading state on Send button', () => {
    render(<Wrapper loading={true} />);

    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
  });

  it('renders tab bar with all tabs', () => {
    render(<Wrapper />);

    expect(screen.getByText(/params/i)).toBeInTheDocument();
    expect(screen.getByText(/auth/i)).toBeInTheDocument();
    expect(screen.getByText(/headers/i)).toBeInTheDocument();
    expect(screen.getByText(/body/i)).toBeInTheDocument();
  });

  it('switches to headers tab', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByText(/headers/i));
    // Should show the KeyValueEditor for headers
    expect(screen.getAllByTestId('key-value-editor').length).toBeGreaterThanOrEqual(1);
  });

  it('switches to body tab and shows editor', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByText(/body/i));
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('switches to auth tab', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByText(/auth/i));
    // Auth tab shows the AuthEditor with auth type selector
    expect(screen.getByText(/Authentication Type/i)).toBeInTheDocument();
  });

  it('calls onSend when Send button is clicked', async () => {
    const mockSend = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper onSend={mockSend} />);

    // Need to set URL first because Send is disabled when URL is empty
    const urlInput = screen.getByTestId('variable-aware-input');
    await user.type(urlInput, 'https://api.example.com');

    await user.click(screen.getByText('Send'));
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('allows changing HTTP method', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const methodSelect = screen.getByDisplayValue('GET');
    await user.selectOptions(methodSelect, 'POST');
    expect(methodSelect).toHaveValue('POST');
  });

  it('renders params tab by default with KeyValueEditor', () => {
    render(<Wrapper />);

    // Params tab is default, should show KeyValueEditor
    expect(screen.getByTestId('key-value-editor')).toBeInTheDocument();
  });
});
