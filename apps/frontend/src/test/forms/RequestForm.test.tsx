import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestForm } from '../../forms/RequestForm';
import type { RequestFormData } from '../../forms/RequestForm';
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';

const {
  mockGetActiveTab,
  mockLoadProfiles,
  mockCreateProfile,
  mockUpdateProfile,
  mockDeleteProfile,
  mockGetCache,
  mockSaveCache,
} = vi.hoisted(() => ({
  mockGetActiveTab: vi.fn(),
  mockLoadProfiles: vi.fn().mockResolvedValue(undefined),
  mockCreateProfile: vi.fn(),
  mockUpdateProfile: vi.fn(),
  mockDeleteProfile: vi.fn(),
  mockGetCache: vi.fn(),
  mockSaveCache: vi.fn(),
}));
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

vi.mock('../../store/graphql/store', () => ({
  useGraphQLSchemaStore: () => ({
    profiles: [],
    loading: false,
    loaded: true,
    loadProfiles: mockLoadProfiles,
    createProfile: mockCreateProfile,
    updateProfile: mockUpdateProfile,
    deleteProfile: mockDeleteProfile,
    getCache: mockGetCache,
    saveCache: mockSaveCache,
  }),
}));

vi.mock('../../store/tabs/store', () => ({
  useTabsStore: Object.assign(
    () => ({
      getActiveTab: mockGetActiveTab,
      updateTabRequest: vi.fn(),
    }),
    { getState: () => ({}) },
  ),
}));

function renderForm({
  onSend,
  onCancel,
  onFetchGraphQLSchema,
  loading = false,
}: {
  onSend?: (data: RequestFormData) => void;
  onCancel?: () => void;
  onFetchGraphQLSchema?: (data: RequestFormData) => Promise<GraphQLSchema>;
  loading?: boolean;
} = {}) {
  return render(
    <RequestForm
      onSend={onSend ?? vi.fn()}
      onCancel={onCancel ?? vi.fn()}
      onFetchGraphQLSchema={onFetchGraphQLSchema}
      loading={loading}
    />,
  );
}

describe('RequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveTab.mockReturnValue({
      id: 'tab-1',
      request: { method: 'GET', url: '', headers: {}, body: '', bodyType: 'json', auth: { type: 'none' }, formDataEntries: [] },
    });
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

  it('switches to the first-class GraphQL editor', async () => {
    const user = userEvent.setup();
    renderForm();

    const requestPicker = screen.getByLabelText('Request method or type');
    await user.selectOptions(requestPicker, 'graphql:post');

    expect(requestPicker).toHaveValue('graphql:post');
    expect(screen.getByRole('option', { name: 'GQL POST' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'GQL GET' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'GraphQL transport' })).not.toBeInTheDocument();
    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.getByText('Variables')).toBeInTheDocument();
    expect(screen.queryByLabelText('GraphQL operation')).not.toBeInTheDocument();
    expect(screen.queryByText(/params/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/body/i)).not.toBeInTheDocument();
  });

  it('warns that multiple operations are unsupported without showing a selector', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Request method or type'), 'graphql:post');
    fireEvent.change(screen.getByTestId('monaco-editor'), {
      target: { value: 'query Users { users { id } } mutation Create { createUser { id } }' },
    });

    expect(screen.queryByLabelText('GraphQL operation')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Multiple operations are not supported. Keep one operation in the query.',
    );
    expect(screen.getByLabelText('Request method or type')).toHaveValue('graphql:post');
  });

  it('fetches schema directly from the URL bar and opens the roomy explorer', async () => {
    const user = userEvent.setup();
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { greeting: { type: GraphQLString } },
      }),
    });
    const onFetchGraphQLSchema = vi.fn().mockResolvedValue(schema);
    renderForm({ onFetchGraphQLSchema });

    await user.selectOptions(screen.getByLabelText('Request method or type'), 'graphql:get');
    expect(screen.getByLabelText('Request method or type')).toHaveValue('graphql:get');
    expect(screen.queryByRole('combobox', { name: 'GraphQL transport' })).not.toBeInTheDocument();
    await user.type(screen.getByTestId('variable-aware-input'), 'https://api.example.com/graphql');
    expect(screen.getByRole('tooltip', { name: 'Fetch schema for IntelliSense' })).toBeInTheDocument();
    expect(screen.getByRole('tooltip', { name: 'Browse schema documentation' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Fetch GraphQL schema'));

    await vi.waitFor(() => expect(onFetchGraphQLSchema).toHaveBeenCalledOnce());
    const viewSchema = screen.getByLabelText('View GraphQL schema');
    expect(viewSchema).not.toBeDisabled();
    await user.click(viewSchema);
    expect(await screen.findByText('GraphQL Schema')).toBeInTheDocument();
  });

  it('automatically fetches schema when a saved GraphQL request opens', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { greeting: { type: GraphQLString } },
      }),
    });
    const onFetchGraphQLSchema = vi.fn().mockResolvedValue(schema);
    mockGetActiveTab.mockReturnValue({
      id: 'tab-saved-graphql',
      savedRequestId: 'request-1',
      request: {
        requestType: 'graphql',
        method: 'POST',
        url: 'https://api.example.com/graphql',
        headers: {},
        auth: { type: 'none' },
        graphql: { document: 'query { greeting }', variables: '', transport: 'post' },
      },
    });

    renderForm({ onFetchGraphQLSchema });

    await vi.waitFor(() => expect(onFetchGraphQLSchema).toHaveBeenCalledOnce());
    expect(onFetchGraphQLSchema.mock.calls[0][0]).toMatchObject({
      requestType: 'graphql',
      url: 'https://api.example.com/graphql',
    });
  });

  it('does not automatically fetch schema for an unsaved GraphQL draft', async () => {
    const onFetchGraphQLSchema = vi.fn();
    mockGetActiveTab.mockReturnValue({
      id: 'tab-draft-graphql',
      request: {
        requestType: 'graphql',
        method: 'POST',
        url: 'https://api.example.com/graphql',
        headers: {},
        auth: { type: 'none' },
        graphql: { document: '', variables: '', transport: 'post' },
      },
    });

    renderForm({ onFetchGraphQLSchema });
    await Promise.resolve();

    expect(onFetchGraphQLSchema).not.toHaveBeenCalled();
  });

  it('falls back to the request endpoint when a linked profile is missing', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { greeting: { type: GraphQLString } },
      }),
    });
    const onFetchGraphQLSchema = vi.fn().mockResolvedValue(schema);
    mockGetActiveTab.mockReturnValue({
      id: 'tab-missing-profile',
      savedRequestId: 'request-1',
      request: {
        requestType: 'graphql',
        method: 'POST',
        url: 'https://api.example.com/graphql',
        headers: {},
        auth: { type: 'none' },
        graphql: {
          document: 'query { greeting }',
          variables: '',
          transport: 'post',
          schemaProfileId: 'deleted-profile',
        },
      },
    });

    renderForm({ onFetchGraphQLSchema });

    await vi.waitFor(() => expect(onFetchGraphQLSchema).toHaveBeenCalledOnce());
    expect(onFetchGraphQLSchema.mock.calls[0][0].url).toBe('https://api.example.com/graphql');
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
