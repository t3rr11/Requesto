import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyValueEditor } from '../../components/KeyValueEditor';
import type { KeyValueRow } from '../../components/KeyValueEditor';

const emptyRow: KeyValueRow = { id: '1', key: '', value: '', enabled: true };
const sampleRows: KeyValueRow[] = [
  { id: '2', key: 'Content-Type', value: 'application/json', enabled: true },
  { id: '3', key: 'Authorization', value: 'Bearer token', enabled: false },
];

describe('KeyValueEditor', () => {
  it('renders in table mode by default', () => {
    render(<KeyValueEditor items={sampleRows} onItemsChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Content-Type')).toBeInTheDocument();
    expect(screen.getByDisplayValue('application/json')).toBeInTheDocument();
  });

  it('shows add button', () => {
    render(<KeyValueEditor items={[]} onItemsChange={vi.fn()} addLabel="Add Header" />);
    expect(screen.getByText('Add Header')).toBeInTheDocument();
  });

  it('adds a new row on add button click', async () => {
    const user = userEvent.setup();
    const onItemsChange = vi.fn();
    render(<KeyValueEditor items={sampleRows} onItemsChange={onItemsChange} addLabel="Add" />);
    await user.click(screen.getByText('Add'));
    const callArg = onItemsChange.mock.calls[0][0];
    expect(callArg).toHaveLength(3);
    expect(callArg[2].key).toBe('');
    expect(callArg[2].value).toBe('');
    expect(callArg[2].enabled).toBe(true);
  });

  it('removes a row on delete button click', async () => {
    const user = userEvent.setup();
    const onItemsChange = vi.fn();
    render(<KeyValueEditor items={sampleRows} onItemsChange={onItemsChange} />);
    const deleteButtons = screen.getAllByTitle('Delete row');
    await user.click(deleteButtons[0]);
    expect(onItemsChange).toHaveBeenCalledWith([sampleRows[1]]);
  });

  it('updates key when typing', async () => {
    const user = userEvent.setup();
    const onItemsChange = vi.fn();
    render(<KeyValueEditor items={[emptyRow]} onItemsChange={onItemsChange} />);
    const keyInput = screen.getByPlaceholderText('Key');
    await user.type(keyInput, 'X');
    expect(onItemsChange).toHaveBeenCalled();
  });

  it('toggles row enabled state via checkbox', async () => {
    const user = userEvent.setup();
    const onItemsChange = vi.fn();
    render(<KeyValueEditor items={sampleRows} onItemsChange={onItemsChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // First row is enabled, click to disable
    await user.click(checkboxes[0]);
    expect(onItemsChange).toHaveBeenCalledWith([
      { ...sampleRows[0], enabled: false },
      sampleRows[1],
    ]);
  });

  it('switches to bulk edit mode', async () => {
    const user = userEvent.setup();
    render(<KeyValueEditor items={sampleRows} onItemsChange={vi.fn()} delimiter=":" />);
    await user.click(screen.getByText('Bulk Edit'));
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toContain('Content-Type:application/json');
  });

  it('parses bulk edit text back to items on switch to table', async () => {
    const user = userEvent.setup();
    const onItemsChange = vi.fn();
    render(<KeyValueEditor items={[]} onItemsChange={onItemsChange} delimiter=":" />);
    await user.click(screen.getByText('Bulk Edit'));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Accept:text/html');
    await user.click(screen.getByText('Table View'));
    expect(onItemsChange).toHaveBeenCalled();
    const callArg = onItemsChange.mock.calls[0][0];
    expect(callArg[0].key).toBe('Accept');
    expect(callArg[0].value).toBe('text/html');
  });

  it('renders disabled state', () => {
    render(<KeyValueEditor items={sampleRows} onItemsChange={vi.fn()} disabled />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => expect(input).toBeDisabled());
  });
});
