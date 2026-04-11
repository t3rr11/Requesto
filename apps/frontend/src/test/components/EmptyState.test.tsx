import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../../components/EmptyState';

describe('EmptyState', () => {
  it('renders title and description (lg)', () => {
    render(
      <EmptyState icon={<span data-testid="icon" />} title="No items" description="Create one to get started" />,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Create one to get started')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    render(
      <EmptyState
        icon={<span />}
        title="Empty"
        description="Add something"
        action={{ label: 'Add Item', onClick: () => {} }}
      />,
    );
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('calls action onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <EmptyState
        icon={<span />}
        title="Empty"
        description="Add something"
        action={{ label: 'Create', onClick: handleClick }}
      />,
    );
    await user.click(screen.getByText('Create'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('renders compact version for sm size', () => {
    render(
      <EmptyState icon={<span />} title="Nothing here" description="Try again" size="sm" />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
