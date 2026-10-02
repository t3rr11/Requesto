import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeEditor } from '../../components/CodeEditor';

const mockEditor = vi.fn();
vi.mock('@monaco-editor/react', () => ({
  default: (props: Record<string, unknown>) => {
    mockEditor(props);
    return (
      <textarea
        data-testid="monaco-editor"
        value={String(props.value ?? '')}
        onChange={(e) => (props.onChange as ((v: string) => void) | undefined)?.(e.target.value)}
        readOnly
      />
    );
  },
}));

describe('CodeEditor', () => {
  it('renders with the configured language and value', () => {
    render(<CodeEditor language="json" value={'{"a":1}'} />);

    expect(screen.getByTestId('monaco-editor')).toHaveValue('{"a":1}');
    expect(mockEditor).toHaveBeenCalledWith(expect.objectContaining({ language: 'json' }));
  });

  it('fires onChange when the user types', () => {
    const onChange = vi.fn();
    render(<CodeEditor language="json" value="" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('monaco-editor'), { target: { value: 'x' } });
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('renders read-only when requested', () => {
    render(<CodeEditor language="json" value="" readOnly />);

    const props = mockEditor.mock.calls[mockEditor.mock.calls.length - 1][0];
    expect(props.options.readOnly).toBe(true);
    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('readonly');
  });
});
