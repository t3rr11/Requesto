import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../components/Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick handler', async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Test</Button>);
    await user.click(screen.getByRole('button'));
    expect(clicked).toBe(true);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Test</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Test</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    render(<Button loading>Test</Button>);
    const button = screen.getByRole('button');
    expect(button.querySelector('.animate-spin')).not.toBeNull();
  });

  it('applies variant classes', () => {
    const { rerender } = render(<Button variant="primary">Test</Button>);
    expect(screen.getByRole('button').className).toContain('bg-blue-600');

    rerender(<Button variant="danger">Test</Button>);
    expect(screen.getByRole('button').className).toContain('bg-red-600');

    rerender(<Button variant="ghost">Test</Button>);
    expect(screen.getByRole('button').className).toContain('hover:bg-gray-100');
  });

  it('applies size classes', () => {
    const { rerender } = render(<Button size="sm">Test</Button>);
    expect(screen.getByRole('button').className).toContain('text-sm');

    rerender(<Button size="lg">Test</Button>);
    expect(screen.getByRole('button').className).toContain('text-lg');
  });

  it('merges custom className', () => {
    render(<Button className="my-custom-class">Test</Button>);
    expect(screen.getByRole('button').className).toContain('my-custom-class');
  });
});
