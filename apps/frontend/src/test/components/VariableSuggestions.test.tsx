import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariableSuggestions } from '../../components/variable-input/VariableSuggestions';
import type { EnvironmentVariable } from '../../store/environments/types';

const variables: EnvironmentVariable[] = [
  { key: 'host', value: 'example.com', enabled: true },
  { key: 'api_key', value: 'secret123', enabled: true, isSecret: true },
  { key: 'version', value: 'v2', enabled: true },
];

describe('VariableSuggestions', () => {
  it('renders nothing when not shown', () => {
    const { container } = render(
      <VariableSuggestions show={false} variables={variables} currentVariable="" onInsert={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no variables match', () => {
    const { container } = render(
      <VariableSuggestions show={true} variables={variables} currentVariable="zzzzz" onInsert={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all variables when currentVariable is empty', () => {
    render(
      <VariableSuggestions show={true} variables={variables} currentVariable="" onInsert={vi.fn()} />,
    );
    expect(screen.getByText('host')).toBeInTheDocument();
    expect(screen.getByText('api_key')).toBeInTheDocument();
    expect(screen.getByText('version')).toBeInTheDocument();
  });

  it('filters variables by current input', () => {
    render(
      <VariableSuggestions show={true} variables={variables} currentVariable="api" onInsert={vi.fn()} />,
    );
    expect(screen.getByText('api_key')).toBeInTheDocument();
    expect(screen.queryByText('host')).not.toBeInTheDocument();
    expect(screen.queryByText('version')).not.toBeInTheDocument();
  });

  it('masks secret variable values', () => {
    render(
      <VariableSuggestions show={true} variables={variables} currentVariable="api" onInsert={vi.fn()} />,
    );
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('secret123')).not.toBeInTheDocument();
  });

  it('shows non-secret variable values', () => {
    render(
      <VariableSuggestions show={true} variables={variables} currentVariable="host" onInsert={vi.fn()} />,
    );
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('calls onInsert when clicking a variable', async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    render(
      <VariableSuggestions show={true} variables={variables} currentVariable="" onInsert={onInsert} />,
    );
    await user.click(screen.getByText('host'));
    expect(onInsert).toHaveBeenCalledWith('host');
  });
});
