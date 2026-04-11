import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../../components/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog isOpen={false} onClose={() => {}} onConfirm={() => {}} title="Delete" message="Are you sure?" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders title and message when open', () => {
    render(
      <ConfirmDialog isOpen={true} onClose={() => {}} onConfirm={() => {}} title="Delete Item" message="This cannot be undone." />,
    );
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('shows custom button text', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete"
        message="Sure?"
        confirmText="Yes, delete"
        cancelText="No"
      />,
    );
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('calls onConfirm and onClose when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Delete"
        message="Sure?"
        confirmText="Yes"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(handleConfirm).toHaveBeenCalledOnce();
    expect(handleClose).toHaveBeenCalledOnce();
  });
});
