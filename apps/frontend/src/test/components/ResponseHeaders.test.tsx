import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseHeaders } from '../../components/response/ResponseHeaders';

describe('ResponseHeaders', () => {
  it('renders header key-value pairs', () => {
    render(
      <ResponseHeaders
        headers={{
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        }}
      />,
    );
    expect(screen.getByText('Content-Type')).toBeInTheDocument();
    expect(screen.getByText('application/json')).toBeInTheDocument();
    expect(screen.getByText('Cache-Control')).toBeInTheDocument();
    expect(screen.getByText('no-cache')).toBeInTheDocument();
  });

  it('shows "No headers" when empty', () => {
    render(<ResponseHeaders headers={{}} />);
    expect(screen.getByText('No headers')).toBeInTheDocument();
  });
});
