import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpContent } from '../../components/HelpContent';

describe('HelpContent', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders keyboard shortcuts section', () => {
    render(<HelpContent onClose={mockOnClose} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('displays common shortcuts', () => {
    render(<HelpContent onClose={mockOnClose} />);
    expect(screen.getByText(/Save request/)).toBeInTheDocument();
    expect(screen.getByText(/Close modal/)).toBeInTheDocument();
  });

  it('displays environment variables section', () => {
    render(<HelpContent onClose={mockOnClose} />);
    expect(screen.getByText('Environment Variables')).toBeInTheDocument();
  });

  it('calls onClose when Got it! button is clicked', () => {
    render(<HelpContent onClose={mockOnClose} />);
    const gotItBtn = screen.getByText('Got it!');
    fireEvent.click(gotItBtn);
    expect(mockOnClose).toHaveBeenCalledOnce();
  });
});
