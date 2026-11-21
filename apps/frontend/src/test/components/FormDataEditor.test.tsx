import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormDataEditor } from '../../components/FormDataEditor';
import type { FormDataEntry } from '../../store/request/types';

vi.mock('../../components/VariableAwareInput', () => ({
  VariableAwareInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />,
}));

function entry(overrides: Partial<FormDataEntry> = {}): FormDataEntry {
  return { id: 'row-1', key: 'field', value: '', type: 'text', enabled: true, ...overrides };
}

function setup(initial: FormDataEntry[] = [entry()]) {
  const onItemsChange = vi.fn();
  function Wrapper() {
    const [items, setItems] = useState(initial);
    return (
      <FormDataEditor
        items={items}
        onItemsChange={next => {
          onItemsChange(next);
          setItems(next);
        }}
      />
    );
  }
  render(<Wrapper />);
  return { onItemsChange };
}

describe('FormDataEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a row with key, type selector and value inputs', () => {
    setup([entry({ key: 'name', value: 'value' })]);

    expect(screen.getByDisplayValue('name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('value')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('text');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('emits updated items when the key is edited', async () => {
    const user = userEvent.setup();
    const { onItemsChange } = setup([entry({ key: '' })]);

    await user.type(screen.getByPlaceholderText('Field'), 'a');
    expect(onItemsChange).toHaveBeenLastCalledWith([entry({ key: 'a' })]);
  });

  it('emits updated items when the value is edited', async () => {
    const user = userEvent.setup();
    const { onItemsChange } = setup();

    await user.type(screen.getByPlaceholderText('Value'), 'x');
    expect(onItemsChange).toHaveBeenLastCalledWith([entry({ value: 'x' })]);
  });

  it('replaces the last row with a fresh empty row when the only row is deleted', async () => {
    const user = userEvent.setup();
    const { onItemsChange } = setup();

    await user.click(screen.getByTitle('Delete row'));
    expect(onItemsChange).toHaveBeenCalledWith([expect.objectContaining({ key: '', value: '', enabled: true })]);
  });

  it('shows a file picker when the row type is switched to File', async () => {
    const user = userEvent.setup();
    const { onItemsChange } = setup();

    await user.selectOptions(screen.getByRole('combobox'), 'file');
    expect(onItemsChange).toHaveBeenLastCalledWith([entry({ type: 'file' })]);
    expect(screen.getByText('Choose file')).toBeInTheDocument();
    expect(screen.getByText('No file selected')).toBeInTheDocument();
  });

  it('reads a chosen file into fileName and fileContent as a data URL', async () => {
    const user = userEvent.setup();
    const { onItemsChange } = setup([entry({ type: 'file' })]);

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('Choose file'), file);

    await waitFor(() =>
      expect(onItemsChange).toHaveBeenLastCalledWith([
        expect.objectContaining({
          fileName: 'hello.txt',
          fileContent: expect.stringMatching(/^data:text\/plain;base64,/),
        }),
      ])
    );
  });

  it('shows the selected file name and estimated size', () => {
    setup([entry({ type: 'file', fileName: 'hello.txt', fileContent: 'data:text/plain;base64,aGVsbG8=' })]);

    expect(screen.getByText(/hello\.txt/)).toBeInTheDocument();
    expect(screen.getByText(/\(5 B\)/)).toBeInTheDocument();
  });
});
