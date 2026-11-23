import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceSettingsForm } from '../../forms/AppearanceSettingsForm';
import { useSettingsStore } from '../../store/settings/store';

describe('AppearanceSettingsForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ disableEventThemes: false, overrideEventTheme: null });
  });

  it('defaults to auto (date-based) with no override persisted', () => {
    render(<AppearanceSettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    const select = screen.getByLabelText(/holiday theme/i) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.getByRole('option', { name: /auto \(date-based\)/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /halloween/i })).toBeInTheDocument();
  });

  it('initialises the picker and checkbox from the current store values', () => {
    useSettingsStore.setState({ disableEventThemes: true, overrideEventTheme: 'halloween' });
    render(<AppearanceSettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    const select = screen.getByLabelText(/holiday theme/i) as HTMLSelectElement;
    expect(select.value).toBe('halloween');
    expect(select).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /disable holiday & event themes/i })).toBeChecked();
  });

  it('forces the picked theme on via the override on submit', async () => {
    const user = userEvent.setup();
    render(<AppearanceSettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    await user.selectOptions(screen.getByLabelText(/holiday theme/i), 'halloween');
    await user.click(screen.getByText('Save Settings'));
    await vi.waitFor(() => {
      expect(useSettingsStore.getState().overrideEventTheme).toBe('halloween');
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });
  });

  it('clears the override when switching back to auto', async () => {
    const user = userEvent.setup();
    useSettingsStore.setState({ overrideEventTheme: 'halloween' });
    render(<AppearanceSettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    await user.selectOptions(screen.getByLabelText(/holiday theme/i), '');
    await user.click(screen.getByText('Save Settings'));
    await vi.waitFor(() => {
      expect(useSettingsStore.getState().overrideEventTheme).toBeNull();
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });
  });

  it('persists the disable opt-out on submit', async () => {
    const user = userEvent.setup();
    render(<AppearanceSettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    await user.click(screen.getByRole('checkbox', { name: /disable holiday & event themes/i }));
    await user.click(screen.getByText('Save Settings'));
    await vi.waitFor(() => {
      expect(useSettingsStore.getState().disableEventThemes).toBe(true);
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });
  });

  it('calls onCancel without mutating the store', async () => {
    const user = userEvent.setup();
    render(<AppearanceSettingsForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    await user.click(screen.getByRole('checkbox', { name: /disable holiday & event themes/i }));
    await user.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState().disableEventThemes).toBe(false);
  });
});
