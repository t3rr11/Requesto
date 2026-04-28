import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthEditor } from '../../components/AuthEditor';
import type { AuthConfig } from '../../store/request/types';

vi.mock('../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    environmentsData: {
      activeEnvironmentId: null,
      environments: [],
    },
  }),
}));

vi.mock('../../store/oauth/store', () => ({
  useOAuthStore: () => ({
    configs: [],
    tokenStatuses: {},
    loadConfigs: vi.fn(),
    loadTokenStatus: vi.fn(),
  }),
}));

describe('AuthEditor', () => {
  const defaultAuth: AuthConfig = { type: 'none' };
  const mockOnAuthChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders auth type selector', () => {
    render(<AuthEditor auth={defaultAuth} onAuthChange={mockOnAuthChange} />);
    const select = screen.getByDisplayValue('No Auth');
    expect(select).toBeInTheDocument();
  });

  it('shows no auth message when type is none', () => {
    render(<AuthEditor auth={defaultAuth} onAuthChange={mockOnAuthChange} />);
    expect(screen.getByText(/does not use any authentication/i)).toBeInTheDocument();
  });

  it('shows basic auth fields when type is basic', () => {
    const auth: AuthConfig = { type: 'basic', basic: { username: '', password: '' } };
    render(<AuthEditor auth={auth} onAuthChange={mockOnAuthChange} />);
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('shows bearer token field when type is bearer', () => {
    const auth: AuthConfig = { type: 'bearer', bearer: { token: '' } };
    render(<AuthEditor auth={auth} onAuthChange={mockOnAuthChange} />);
    expect(screen.getByText('Token')).toBeInTheDocument();
  });

  it('shows API key fields when type is api-key', () => {
    const auth: AuthConfig = { type: 'api-key', apiKey: { key: '', value: '', addTo: 'header' } };
    render(<AuthEditor auth={auth} onAuthChange={mockOnAuthChange} />);
    expect(screen.getByText('Key')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('Add To')).toBeInTheDocument();
  });

  it('calls onAuthChange when type changes', () => {
    render(<AuthEditor auth={defaultAuth} onAuthChange={mockOnAuthChange} />);
    const select = screen.getByDisplayValue('No Auth');
    fireEvent.change(select, { target: { value: 'basic' } });
    expect(mockOnAuthChange).toHaveBeenCalled();
  });
});
