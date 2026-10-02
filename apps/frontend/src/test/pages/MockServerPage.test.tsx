import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MockServerPage } from '../../pages/MockServerPage';
import { useMockStore } from '../../store/mock/store';
import { useUIStore } from '../../store/ui/store';
import type { MockEndpoint } from '../../store/mock/types';

vi.mock('@monaco-editor/react', () => ({
  default: (props: Record<string, unknown>) => (
    <textarea data-testid="monaco-editor" value={String(props.value ?? '')} onChange={() => {}} readOnly />
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeEndpoint(overrides: Partial<MockEndpoint> = {}): MockEndpoint {
  return {
    id: 'mep-1',
    name: 'Users API',
    path: '/api/users',
    enabled: true,
    mode: 'static',
    methods: {
      GET: { status: 200, headers: {}, contentType: 'json', body: '[]', delayMs: 0 },
    },
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MockServerPage />
    </MemoryRouter>
  );
}

/**
 * Route /api calls by URL so status polling, endpoint loading each get the
 * right payload.
 */
function mockApiByUrl(handler: (url: string, init?: RequestInit) => unknown) {
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => ({
    ok: true,
    json: () => Promise.resolve(handler(url, init)),
  }));
}

describe('MockServerPage', () => {
  beforeEach(() => {
    useMockStore.setState({
      endpoints: [],
      loading: false,
      status: { running: false, port: 0, url: null },
      selectedEndpointId: null,
      logs: [],
      error: null,
      datasetCounts: {},
    });
    useUIStore.setState({ isMockLogOpen: true, mockLogHeight: 200 });
    mockFetch.mockReset();
  });

  it('shows an empty state initially', () => {
    mockApiByUrl(url => (url.includes('/status') ? { running: false, port: 0, url: null } : []));

    renderPage();

    expect(screen.getByText('No endpoint selected')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Server' })).not.toBeInTheDocument();
  });

  it('shows the endpoint URL with a copy button in the editor while running', () => {
    useMockStore.setState({ status: { running: true, port: 4748, url: 'http://localhost:4748' } });
    mockApiByUrl(url => (url.includes('/status') ? { running: true, port: 4748, url: 'http://localhost:4748' } : []));
    useMockStore.setState({
      endpoints: [makeEndpoint()],
      selectedEndpointId: 'mep-1',
    });

    renderPage();

    expect(screen.getByText('http://localhost:4748')).toBeInTheDocument();
    expect(screen.getByTitle('Copy endpoint URL')).toBeInTheDocument();
  });

  it('loads endpoints and selects one for editing', async () => {
    const endpoint = makeEndpoint();
    mockApiByUrl(url => (url.includes('/status') ? { running: false, port: 0, url: null } : [endpoint]));
    useMockStore.setState({ endpoints: [endpoint], selectedEndpointId: 'mep-1' });

    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue('Users API')).toBeInTheDocument());
    expect(screen.getByDisplayValue('/api/users')).toBeInTheDocument();
  });

  it('renders the mock request log through the shared console component', () => {
    mockApiByUrl(url => (url.includes('/status') ? { running: false, port: 0, url: null } : []));
    useMockStore.setState({
      logs: [
        {
          id: 'mlog-1',
          timestamp: 1,
          method: 'GET',
          path: '/api/users',
          status: 200,
          endpointName: 'Users API',
          durationMs: 2,
        },
      ],
    });

    renderPage();

    // The docked console is the shared ConsolePanel: "Console" title bar + mapped entries
    expect(screen.getByText('Console')).toBeInTheDocument();
    expect(screen.getByText('/api/users', { selector: 'span' })).toBeInTheDocument();
  });

  it('collapses the mock request log from its title bar', () => {
    mockApiByUrl(url => (url.includes('/status') ? { running: false, port: 0, url: null } : []));
    useUIStore.setState({ isMockLogOpen: true });
    renderPage();

    const titleBar = screen.getByText('Console').closest('div');
    expect(titleBar).not.toBeNull();
    fireEvent.click(titleBar!);

    expect(useUIStore.getState().isMockLogOpen).toBe(false);
  });
});
