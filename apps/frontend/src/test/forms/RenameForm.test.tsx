import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RenameForm } from '../../forms/RenameForm';

describe('RenameForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with current name', () => {
    render(
      <RenameForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        currentName="Old Name"
        title="Rename Collection"
        label="Collection Name"
      />,
    );

    expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument();
    expect(screen.getByText('Rename Collection')).toBeInTheDocument();
    expect(screen.getByText('Collection Name')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <RenameForm
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        currentName="Old Name"
        title="Rename"
        label="Name"
      />,
    );

    expect(screen.queryByText('Rename')).not.toBeInTheDocument();
  });

  it('submits new name', async () => {
    const user = userEvent.setup();
    render(
      <RenameForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        currentName="Old Name"
        title="Rename"
        label="Name"
      />,
    );

    const input = screen.getByDisplayValue('Old Name');
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.click(screen.getByText('Save'));

    await vi.waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('New Name');
      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup();
    render(
      <RenameForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        currentName="Old Name"
        title="Rename"
        label="Name"
      />,
    );

    const input = screen.getByDisplayValue('Old Name');
    await user.clear(input);
    await user.click(screen.getByText('Save'));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('resets on cancel', async () => {
    const user = userEvent.setup();
    render(
      <RenameForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        currentName="Old Name"
        title="Rename"
        label="Name"
      />,
    );

    await user.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('uses custom placeholder', () => {
    render(
      <RenameForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        currentName=""
        title="Rename"
        label="Name"
        placeholder="Enter folder name..."
      />,
    );

    expect(screen.getByPlaceholderText('Enter folder name...')).toBeInTheDocument();
  });
});
