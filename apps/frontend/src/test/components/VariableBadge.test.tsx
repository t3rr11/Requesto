import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VariableBadge } from '../../components/variable-input/VariableBadge';

describe('VariableBadge', () => {
  it('renders nothing when variableCount is 0', () => {
    const { container } = render(
      <VariableBadge variableCount={0} hasUndefinedVariables={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders singular label for 1 variable', () => {
    render(<VariableBadge variableCount={1} hasUndefinedVariables={false} />);
    expect(screen.getByText('1 var')).toBeInTheDocument();
  });

  it('renders plural label for multiple variables', () => {
    render(<VariableBadge variableCount={3} hasUndefinedVariables={false} />);
    expect(screen.getByText('3 vars')).toBeInTheDocument();
  });

  it('uses blue style when all variables are defined', () => {
    render(<VariableBadge variableCount={2} hasUndefinedVariables={false} />);
    const badge = screen.getByText('2 vars');
    expect(badge.className).toContain('bg-blue-100');
  });

  it('uses yellow style when some variables are undefined', () => {
    render(<VariableBadge variableCount={2} hasUndefinedVariables={true} />);
    const badge = screen.getByText('2 vars');
    expect(badge.className).toContain('bg-yellow-100');
  });
});
