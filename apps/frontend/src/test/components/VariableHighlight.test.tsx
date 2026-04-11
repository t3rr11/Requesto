import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VariableHighlight } from '../../components/variable-input/VariableHighlight';
import type { EnvironmentVariable } from '../../store/environments/types';

const enabledVars: EnvironmentVariable[] = [
  { key: 'host', value: 'example.com', enabled: true },
  { key: 'token', value: 'abc123', enabled: true },
];

describe('VariableHighlight', () => {
  it('renders nothing for empty value', () => {
    const { container } = render(
      <VariableHighlight
        value=""
        enabledVariables={enabledVars}
        onVariableHover={vi.fn()}
        onVariableLeave={vi.fn()}
        onVariableClick={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders highlighted variables', () => {
    render(
      <VariableHighlight
        value="https://{{host}}/api"
        enabledVariables={enabledVars}
        onVariableHover={vi.fn()}
        onVariableLeave={vi.fn()}
        onVariableClick={vi.fn()}
      />,
    );
    expect(screen.getByText('{{host}}')).toBeInTheDocument();
  });

  it('applies blue style for defined variables', () => {
    render(
      <VariableHighlight
        value="{{host}}"
        enabledVariables={enabledVars}
        onVariableHover={vi.fn()}
        onVariableLeave={vi.fn()}
        onVariableClick={vi.fn()}
      />,
    );
    const varSpan = screen.getByText('{{host}}');
    expect(varSpan.className).toContain('bg-blue-100');
  });

  it('applies yellow style for undefined variables', () => {
    render(
      <VariableHighlight
        value="{{unknown}}"
        enabledVariables={enabledVars}
        onVariableHover={vi.fn()}
        onVariableLeave={vi.fn()}
        onVariableClick={vi.fn()}
      />,
    );
    const varSpan = screen.getByText('{{unknown}}');
    expect(varSpan.className).toContain('bg-yellow-100');
  });

  it('calls onVariableHover on mouse enter', () => {
    const onHover = vi.fn();
    render(
      <VariableHighlight
        value="{{host}}"
        enabledVariables={enabledVars}
        onVariableHover={onHover}
        onVariableLeave={vi.fn()}
        onVariableClick={vi.fn()}
      />,
    );
    fireEvent.mouseEnter(screen.getByText('{{host}}'));
    expect(onHover).toHaveBeenCalledWith(expect.any(Object), 'host');
  });

  it('calls onVariableLeave on mouse leave', () => {
    const onLeave = vi.fn();
    render(
      <VariableHighlight
        value="{{host}}"
        enabledVariables={enabledVars}
        onVariableHover={vi.fn()}
        onVariableLeave={onLeave}
        onVariableClick={vi.fn()}
      />,
    );
    fireEvent.mouseLeave(screen.getByText('{{host}}'));
    expect(onLeave).toHaveBeenCalled();
  });

  it('calls onVariableClick with varKey and instance index', () => {
    const onClick = vi.fn();
    render(
      <VariableHighlight
        value="{{host}} and {{host}}"
        enabledVariables={enabledVars}
        onVariableHover={vi.fn()}
        onVariableLeave={vi.fn()}
        onVariableClick={onClick}
      />,
    );
    const spans = screen.getAllByText('{{host}}');
    fireEvent.click(spans[1]);
    expect(onClick).toHaveBeenCalledWith('host', 1);
  });
});
