import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OAuthConfigForm } from '../../forms/OAuthConfigForm';

describe('OAuthConfigForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn().mockResolvedValue(undefined);
  const mockOnDelete = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode dialog with guided wizard', () => {
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.getByText('New OAuth Configuration')).toBeInTheDocument();
    // Step 1 shows Next button, not Create
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.queryByText('Create Configuration')).not.toBeInTheDocument();
    // No provider pre-selected
    expect(screen.getByText('Custom Provider')).toBeInTheDocument();
    // Mode toggle shows as segmented control
    expect(screen.getByText('Guided')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<OAuthConfigForm isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.queryByText('New OAuth Configuration')).not.toBeInTheDocument();
  });

  it('shows wizard step indicator for create mode', () => {
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Credentials')).toBeInTheDocument();
    expect(screen.getByText('Configure')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('requires provider selection before proceeding', async () => {
    const user = userEvent.setup();
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Try to proceed without selecting a provider
    await user.click(screen.getByText('Next'));
    expect(await screen.findByText(/please select a provider/i)).toBeInTheDocument();
  });

  it('shows provider selection cards on step 1', () => {
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.getByText('Microsoft EntraID / Azure AD')).toBeInTheDocument();
    expect(screen.getByText('Google OAuth 2.0')).toBeInTheDocument();
    expect(screen.getByText('GitHub OAuth')).toBeInTheDocument();
    expect(screen.getByText('Auth0')).toBeInTheDocument();
    expect(screen.getByText('Okta')).toBeInTheDocument();
    expect(screen.getByText('Custom Provider')).toBeInTheDocument();
  });

  it('navigates to credentials step via Next button', async () => {
    const user = userEvent.setup();
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Must select a provider first
    await user.click(screen.getByText('Custom Provider'));
    await user.click(screen.getByText('Next'));
    expect(screen.getByLabelText(/configuration name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/client id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/client secret/i)).toBeInTheDocument();
  });

  it('navigates back from credentials step', async () => {
    const user = userEvent.setup();
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    await user.click(screen.getByText('Custom Provider'));
    await user.click(screen.getByText('Next'));
    expect(screen.getByLabelText(/configuration name/i)).toBeInTheDocument();

    await user.click(screen.getByText('Back'));
    expect(screen.getByText('Microsoft EntraID / Azure AD')).toBeInTheDocument();
  });

  it('validates required fields on credentials step before proceeding', async () => {
    const user = userEvent.setup();
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Go to credentials step
    await user.click(screen.getByText('Custom Provider'));
    await user.click(screen.getByText('Next'));

    // Try to proceed without filling fields
    await user.click(screen.getByText('Next'));

    // Should show validation errors
    expect(await screen.findByText(/configuration name is required/i)).toBeInTheDocument();
  });

  it('navigates to configure step with flow type options', async () => {
    const user = userEvent.setup();
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Select provider
    await user.click(screen.getByText('Custom Provider'));
    await user.click(screen.getByText('Next'));

    // Fill required fields
    await user.type(screen.getByLabelText(/configuration name/i), 'Test Config');
    await user.type(screen.getByLabelText(/client id/i), 'client-123');

    // Go to configure step
    await user.click(screen.getByText('Next'));

    expect(screen.getByText('Authorization Code with PKCE')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByLabelText(/scopes/i)).toBeInTheDocument();
  });

  it('navigates to review step with summary', async () => {
    const user = userEvent.setup();
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Provider step - select custom
    await user.click(screen.getByText('Custom Provider'));
    await user.click(screen.getByText('Next'));

    // Credentials step
    await user.type(screen.getByLabelText(/configuration name/i), 'Test Config');
    await user.type(screen.getByLabelText(/client id/i), 'client-123');
    await user.click(screen.getByText('Next'));

    // Configure step - fill custom URLs
    await user.type(screen.getByLabelText(/authorization url/i), 'https://auth.example.com/authorize');
    await user.type(screen.getByLabelText(/token url/i), 'https://auth.example.com/token');
    await user.click(screen.getByText('Next'));

    // Review step
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Test Config')).toBeInTheDocument();
    expect(screen.getByText(/use popup window/i)).toBeInTheDocument();
    expect(screen.getByText(/auto-refresh tokens/i)).toBeInTheDocument();
  });

  it('switches to advanced mode', async () => {
    const user = userEvent.setup();
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    await user.click(screen.getByText('Advanced'));

    // Advanced mode shows all sections
    expect(screen.getByText('Credentials')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Token & Preferences')).toBeInTheDocument();
    expect(screen.getByText('Guided')).toBeInTheDocument();
  });

  it('renders in edit mode with guided wizard skipping provider step', () => {
    const editConfig = {
      id: 'config-1',
      name: 'Test Config',
      provider: 'custom',
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      clientId: 'client-123',
      flowType: 'authorization-code-pkce' as const,
      usePKCE: true,
      scopes: ['openid', 'profile'],
      tokenStorage: 'session' as const,
      usePopup: true,
      autoRefreshToken: true,
      tokenRefreshThreshold: 300,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    render(
      <OAuthConfigForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        editConfig={editConfig}
      />,
    );

    expect(screen.getByText('Edit OAuth Configuration')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    // Edit mode pre-fills form values
    expect(screen.getByDisplayValue('Test Config')).toBeInTheDocument();
    expect(screen.getByDisplayValue('client-123')).toBeInTheDocument();
    // Edit mode defaults to guided, skipping provider step
    expect(screen.queryByText('Provider')).not.toBeInTheDocument();
    expect(screen.getByText('Credentials')).toBeInTheDocument();
    expect(screen.getByText('Configure')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    // Starts at credentials step, so Next is shown (not Save yet)
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('toggles client secret visibility', async () => {
    const user = userEvent.setup();
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Select provider and go to credentials step
    await user.click(screen.getByText('Custom Provider'));
    await user.click(screen.getByText('Next'));

    const secretInput = screen.getByLabelText(/client secret/i);
    expect(secretInput).toHaveAttribute('type', 'password');

    const toggleButtons = screen.getAllByRole('button');
    const eyeButton = toggleButtons.find(
      btn => btn.querySelector('svg') && btn.closest('.relative'),
    );
    if (eyeButton) {
      await user.click(eyeButton);
      expect(secretInput).toHaveAttribute('type', 'text');
    }
  });

  it('shows placeholder inputs for Microsoft provider', async () => {
    const user = userEvent.setup();
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Select Microsoft provider
    await user.click(screen.getByText('Microsoft EntraID / Azure AD'));

    // Go to credentials step
    await user.click(screen.getByText('Next'));

    // Should show tenant placeholder
    expect(screen.getByPlaceholderText(/enter tenant/i)).toBeInTheDocument();
  });

  it('auto-fills scopes when selecting a provider template', async () => {
    const user = userEvent.setup();
    render(<OAuthConfigForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Select Google
    await user.click(screen.getByText('Google OAuth 2.0'));

    // Go to credentials, fill them, then configure step
    await user.click(screen.getByText('Next'));
    await user.type(screen.getByLabelText(/configuration name/i), 'Google Test');
    await user.type(screen.getByLabelText(/client id/i), 'google-client');
    await user.click(screen.getByText('Next'));

    // Check scopes were auto-filled
    expect(screen.getByDisplayValue('openid profile email')).toBeInTheDocument();
  });
});
