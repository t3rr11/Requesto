import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OAuthManagerContent } from '../../forms/OAuthManagerContent';
import { useOAuthStore } from '../../store/oauth/store';
import type { OAuthConfig } from '../../store/oauth/types';

const mockConfigs: OAuthConfig[] = [
  {
    id: 'config-1',
    name: 'GitHub OAuth',
    provider: 'GitHub',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    clientId: 'abc123',
    flowType: 'authorization-code',
    usePKCE: false,
    scopes: ['read:user'],
    tokenStorage: 'local',
    usePopup: false,
    autoRefreshToken: false,
    tokenRefreshThreshold: 300,
  },
  {
    id: 'config-2',
    name: 'Google OAuth',
    provider: 'Google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: 'xyz456',
    flowType: 'authorization-code-pkce',
    usePKCE: true,
    scopes: ['profile'],
    tokenStorage: 'session',
    usePopup: true,
    autoRefreshToken: true,
    tokenRefreshThreshold: 600,
  },
];

const noop = vi.fn();
const baseStore = {
  configs: mockConfigs,
  tokenStatuses: {},
  isLoadingConfigs: false,
  loadConfigs: noop,
  addConfig: noop,
  updateConfig: noop,
  deleteConfig: noop,
  loadTokenStatus: noop,
  clearTokens: noop,
};

vi.mock('../../store/oauth/store', () => ({
  useOAuthStore: vi.fn(() => baseStore),
}));

vi.mock('../../store/alert/store', () => ({
  useAlertStore: vi.fn(() => ({ showAlert: vi.fn() })),
}));

vi.mock('../../hooks/useOAuthFlow', () => ({
  useOAuthFlow: vi.fn(() => ({
    authenticate: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    isAuthenticating: false,
    error: null,
    clearError: vi.fn(),
  })),
}));

function respondWith(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

describe('OAuthManagerContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOAuthStore).mockReturnValue(baseStore as never);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respondWith({})));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the config list with names, providers and short flow labels', () => {
    render(<OAuthManagerContent active />);

    // Config names appear in both the list and the detail header
    expect(screen.getAllByText('GitHub OAuth').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Google OAuth').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('GitHub').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Auth Code')).toBeInTheDocument();
    expect(screen.getByText('Auth Code (PKCE)')).toBeInTheDocument();
  });

  it('pre-selects the first config and shows its detail header', () => {
    render(<OAuthManagerContent active />);

    expect(screen.getByRole('heading', { name: 'GitHub OAuth' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
  });

  it('switches the detail pane when selecting another config', async () => {
    render(<OAuthManagerContent active />);

    fireEvent.click(screen.getByText('Google OAuth'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Google OAuth' })).toBeInTheDocument();
    });
  });

  it('shows a loading state', () => {
    vi.mocked(useOAuthStore).mockReturnValue({
      ...baseStore,
      isLoadingConfigs: true,
      configs: [],
    } as never);
    render(<OAuthManagerContent active />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows an empty list state', () => {
    vi.mocked(useOAuthStore).mockReturnValue({
      ...baseStore,
      configs: [],
    } as never);
    render(<OAuthManagerContent active />);

    expect(screen.getByText('No configurations yet')).toBeInTheDocument();
  });

  it('opens the wizard as a modal when adding a config', async () => {
    render(<OAuthManagerContent active />);

    fireEvent.click(screen.getByTitle('New Config'));
    expect(await screen.findByText('New OAuth Configuration')).toBeInTheDocument();
  });

  it('renders the token details accordion collapsed by default', async () => {
    vi.mocked(useOAuthStore).mockReturnValue({
      ...baseStore,
      tokenStatuses: {
        'config-1': { hasToken: true, hasRefreshToken: false, isExpired: false },
      },
    } as never);
    const fetchMock = vi.fn().mockResolvedValue(respondWith({}));
    vi.stubGlobal('fetch', fetchMock);
    render(<OAuthManagerContent active />);

    await waitFor(() => {
      expect(screen.getByText('Token Details')).toBeInTheDocument();
    });
    // Accordion body is collapsed: no fetched token metadata, no fetch call
    expect(screen.queryByText(/Type: Bearer/)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
