import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OAuthConfigList } from '../../components/OAuthConfigList';
import type { OAuthConfig } from '../../store/oauth/types';

describe('OAuthConfigList', () => {
  const mockOnConfigSelect = vi.fn();
  const mockOnAdd = vi.fn();

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
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of configs', () => {
    render(
      <OAuthConfigList
        configs={mockConfigs}
        selectedConfigId={null}
        isLoadingConfigs={false}
        onConfigSelect={mockOnConfigSelect}
        onAdd={mockOnAdd}
      />,
    );
    expect(screen.getByText('GitHub OAuth')).toBeInTheDocument();
    expect(screen.getByText('Google OAuth')).toBeInTheDocument();
  });

  it('shows flow type labels', () => {
    render(
      <OAuthConfigList
        configs={mockConfigs}
        selectedConfigId={null}
        isLoadingConfigs={false}
        onConfigSelect={mockOnConfigSelect}
        onAdd={mockOnAdd}
      />,
    );
    expect(screen.getByText('Auth Code')).toBeInTheDocument();
    expect(screen.getByText('Auth Code (PKCE)')).toBeInTheDocument();
  });

  it('highlights selected config', () => {
    render(
      <OAuthConfigList
        configs={mockConfigs}
        selectedConfigId="config-1"
        isLoadingConfigs={false}
        onConfigSelect={mockOnConfigSelect}
        onAdd={mockOnAdd}
      />,
    );
    // Selected item should exist
    expect(screen.getByText('GitHub OAuth')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <OAuthConfigList
        configs={[]}
        selectedConfigId={null}
        isLoadingConfigs={true}
        onConfigSelect={mockOnConfigSelect}
        onAdd={mockOnAdd}
      />,
    );
    // SidebarPanel renders children with isLoading flag
    expect(screen.getByText('Configurations')).toBeInTheDocument();
  });

  it('shows empty state when no configs', () => {
    render(
      <OAuthConfigList
        configs={[]}
        selectedConfigId={null}
        isLoadingConfigs={false}
        onConfigSelect={mockOnConfigSelect}
        onAdd={mockOnAdd}
      />,
    );
    expect(screen.getByText('No configurations yet')).toBeInTheDocument();
  });
});
