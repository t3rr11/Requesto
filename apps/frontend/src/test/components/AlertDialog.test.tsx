import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertDialog } from '../../components/AlertDialog';

describe('AlertDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <AlertDialog isOpen={false} onClose={() => {}} title="Error" message="Something went wrong" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders message when open', () => {
    render(
      <AlertDialog isOpen={true} onClose={() => {}} title="Error" message="Something went wrong" />,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows OK button', () => {
    render(
      <AlertDialog isOpen={true} onClose={() => {}} title="Info" message="Done" />,
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('renders distinct title when message differs', () => {
    render(
      <AlertDialog isOpen={true} onClose={() => {}} title="Error Occurred" message="Connection refused" />,
    );
    expect(screen.getByText('Error Occurred')).toBeInTheDocument();
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
  });
});
