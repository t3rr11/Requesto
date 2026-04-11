import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarItem } from '../../components/SidebarItem';

describe('SidebarItem', () => {
  it('renders children', () => {
    render(
      <SidebarItem isSelected={false} onClick={() => {}}>
        My Item
      </SidebarItem>,
    );
    expect(screen.getByText('My Item')).toBeInTheDocument();
  });

  it('calls onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <SidebarItem isSelected={false} onClick={handleClick}>
        Click me
      </SidebarItem>,
    );
    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies selected styles', () => {
    render(
      <SidebarItem isSelected={true} onClick={() => {}}>
        Selected
      </SidebarItem>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-blue-50');
  });

  it('applies unselected styles', () => {
    render(
      <SidebarItem isSelected={false} onClick={() => {}}>
        Normal
      </SidebarItem>,
    );
    const button = screen.getByRole('button');
    expect(button.className).not.toContain('bg-blue-50');
  });
});
