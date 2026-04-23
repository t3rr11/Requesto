import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsForm } from '../../forms/SettingsForm';
import { useSettingsStore } from '../../store/settings/store';

describe('SettingsForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ insecureTls: false });
  });

  it('renders the insecure TLS checkbox unchecked by default and hides the warning', () => {
    render(<SettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    const checkbox = screen.getByRole('checkbox', { name: /ignore ssl certificate errors/i });
    expect(checkbox).not.toBeChecked();
    expect(screen.queryByText(/disabling certificate verification/i)).not.toBeInTheDocument();
  });

  it('shows the security warning banner when insecureTls is toggled on', async () => {
    const user = userEvent.setup();
    render(<SettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    await user.click(screen.getByRole('checkbox', { name: /ignore ssl certificate errors/i }));
    expect(screen.getByText(/disabling certificate verification/i)).toBeInTheDocument();
  });

  it('persists the new value and calls onSuccess on submit', async () => {
    const user = userEvent.setup();
    render(<SettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    await user.click(screen.getByRole('checkbox', { name: /ignore ssl certificate errors/i }));
    await user.click(screen.getByText('Save Settings'));
    await vi.waitFor(() => {
      expect(useSettingsStore.getState().insecureTls).toBe(true);
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });
  });

  it('calls onCancel without mutating the store', () => {
    render(<SettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState().insecureTls).toBe(false);
  });

  it('initialises the checkbox from the current store value', () => {
    useSettingsStore.setState({ insecureTls: true });
    render(<SettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    expect(screen.getByRole('checkbox', { name: /ignore ssl certificate errors/i })).toBeChecked();
    expect(screen.getByText(/disabling certificate verification/i)).toBeInTheDocument();
  });
});
