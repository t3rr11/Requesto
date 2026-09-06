import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TokenDetails } from '../../../components/oauth/TokenDetails';

function encodeSegment(value: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = encodeSegment(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = encodeSegment(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

const jwtAccessToken = makeJwt({
  sub: 'user-1',
  iss: 'https://issuer.example.com',
  aud: 'api://default',
  roles: ['admin', 'reader'],
  groups: ['team-a'],
  exp: 1893456000,
});

const fullTokens = {
  accessToken: jwtAccessToken,
  tokenType: 'Bearer',
  refreshToken: 'opaque-refresh-token-value',
  idToken: makeJwt({ sub: 'user-1', name: 'Test User' }),
  expiresAt: Date.now() + 300_000,
  scope: 'read write',
  obtainedAt: Date.now() - 60_000,
};

function respondWith(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as unknown as Response;
}

const writeText = vi.fn().mockResolvedValue(undefined);
const fetchMock = vi.fn();

describe('TokenDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(respondWith(fullTokens));
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and displays tokens immediately without a reveal gate', async () => {
    render(<TokenDetails configId="config-1" />);

    await waitFor(() => {
      expect(screen.getByText('Access Token')).toBeInTheDocument();
    });
    expect(screen.getByText('Refresh Token')).toBeInTheDocument();
    expect(screen.getByText('ID Token')).toBeInTheDocument();
    expect(screen.getAllByTestId('jwt-claims').length).toBe(2);
  });

  it('shows decoded JWT claims instead of the raw token', async () => {
    render(<TokenDetails configId="config-1" />);

    await waitFor(() => {
      expect(screen.getByText('Access Token')).toBeInTheDocument();
    });
    const accessClaims = screen.getAllByTestId('jwt-claims')[0].textContent ?? '';
    expect(accessClaims).toContain('https://issuer.example.com');
    expect(accessClaims).toContain('admin');
    expect(accessClaims).toContain('team-a');
    expect(screen.queryByText(jwtAccessToken)).not.toBeInTheDocument();
  });

  it('shows the parsed value as a hover tooltip only for date claims', async () => {
    render(<TokenDetails configId="config-1" />);

    await waitFor(() => {
      expect(screen.getByText('Access Token')).toBeInTheDocument();
    });
    const accessClaims = screen.getAllByTestId('jwt-claims')[0];
    // Epoch exp: raw plain number in the cell, converted ISO date on hover
    const expCell = screen.getByText('1893456000');
    expect(expCell.getAttribute('title')).toMatch(/^2030-01-01T00:00:00\.000Z/);
    // Non-date claims (even strings and objects) get no tooltip — the only
    // hovered element in the claims table is the exp cell
    expect(expCell).toBe(accessClaims.querySelector('code[title]'));
    expect(accessClaims.textContent).toContain('"https://issuer.example.com"');
  });

  it('displays opaque tokens as raw text', async () => {
    render(<TokenDetails configId="config-1" />);

    await waitFor(() => {
      expect(screen.getByText('opaque-refresh-token-value')).toBeInTheDocument();
    });
  });

  it('copies the raw token to the clipboard', async () => {
    render(<TokenDetails configId="config-1" />);

    await waitFor(() => {
      expect(screen.getAllByTitle('Copy raw token').length).toBe(3);
    });
    fireEvent.click(screen.getAllByTitle('Copy raw token')[0]);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(jwtAccessToken);
    });
  });

  it('shows an error state when no tokens are stored', async () => {
    fetchMock.mockResolvedValue(respondWith({ error: 'No token' }, false, 404));
    render(<TokenDetails configId="config-1" />);

    expect(await screen.findByText('No token stored for this OAuth configuration')).toBeInTheDocument();
    expect(screen.queryByText('Access Token')).not.toBeInTheDocument();
  });

  it('shows the token status line', async () => {
    render(<TokenDetails configId="config-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Type: Bearer/)).toBeInTheDocument();
    });
    expect(screen.getByText('Scope: read write')).toBeInTheDocument();
  });

  describe('collapsible', () => {
    it('stays collapsed and does not fetch until expanded', async () => {
      render(<TokenDetails configId="config-1" collapsible />);

      expect(screen.getByText('Token Details')).toBeInTheDocument();
      expect(screen.queryByText('Access Token')).not.toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText('Token Details'));
      await waitFor(() => {
        expect(screen.getByText('Access Token')).toBeInTheDocument();
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('shows the expiry badge in the header once loaded', async () => {
      render(<TokenDetails configId="config-1" collapsible />);

      fireEvent.click(screen.getByText('Token Details'));
      await waitFor(() => {
        expect(screen.getByText(/Type: Bearer/)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Token Details'));
      expect(screen.queryByText(/Type: Bearer/)).not.toBeInTheDocument();
      expect(screen.getByText('Token Details')).toBeInTheDocument();
    });
  });
});
