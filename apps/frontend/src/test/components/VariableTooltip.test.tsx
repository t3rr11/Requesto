import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VariableTooltip } from '../../components/variable-input/VariableTooltip';

describe('VariableTooltip', () => {
  it('renders nothing when not shown', () => {
    const { container } = render(
      <VariableTooltip
        show={false}
        x={0}
        y={0}
        variableKey="host"
        variableValue="example.com"
        isSecret={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders variable key and value when shown', () => {
    render(
      <VariableTooltip
        show={true}
        x={100}
        y={200}
        variableKey="host"
        variableValue="example.com"
        isSecret={false}
      />,
    );
    expect(screen.getByText('host')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('masks value for secret variables', () => {
    render(
      <VariableTooltip
        show={true}
        x={0}
        y={0}
        variableKey="api_key"
        variableValue="super-secret-123"
        isSecret={true}
      />,
    );
    expect(screen.getByText('api_key')).toBeInTheDocument();
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('super-secret-123')).not.toBeInTheDocument();
  });

  it('shows empty placeholder for empty value', () => {
    render(
      <VariableTooltip
        show={true}
        x={0}
        y={0}
        variableKey="empty_var"
        variableValue=""
        isSecret={false}
      />,
    );
    expect(screen.getByText('(empty)')).toBeInTheDocument();
  });

  it('shows environment name when provided', () => {
    render(
      <VariableTooltip
        show={true}
        x={0}
        y={0}
        variableKey="host"
        variableValue="api.dev.com"
        isSecret={false}
        environmentName="Development"
      />,
    );
    expect(screen.getByText('Development')).toBeInTheDocument();
  });

  it('positions at specified coordinates', () => {
    const { container } = render(
      <VariableTooltip
        show={true}
        x={150}
        y={250}
        variableKey="test"
        variableValue="val"
        isSecret={false}
      />,
    );
    const tooltip = container.firstChild as HTMLElement;
    expect(tooltip.style.left).toBe('150px');
    expect(tooltip.style.top).toBe('250px');
  });
});
