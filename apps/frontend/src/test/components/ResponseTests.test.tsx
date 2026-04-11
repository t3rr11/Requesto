import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseTests } from '../../components/response/ResponseTests';

describe('ResponseTests', () => {
  it('renders "No tests defined" placeholder', () => {
    render(<ResponseTests />);
    expect(screen.getByText('No tests defined')).toBeInTheDocument();
  });
});
