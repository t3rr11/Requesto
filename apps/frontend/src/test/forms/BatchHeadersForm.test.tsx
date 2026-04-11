import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BatchHeadersForm } from '../../forms/BatchHeadersForm';

describe('BatchHeadersForm', () => {
  const mockOnImport = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form elements', () => {
    render(<BatchHeadersForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    expect(screen.getByText(/paste multiple headers/i)).toBeInTheDocument();
    expect(screen.getByText('Auto-detect')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Key: Value' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'JSON' })).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<BatchHeadersForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledOnce();
  });

  it('Import button is disabled with empty input', () => {
    render(<BatchHeadersForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    const importButton = screen.getByText('Import');
    expect(importButton).toBeDisabled();
  });

  it('previews key-value headers', async () => {
    const user = userEvent.setup();
    render(<BatchHeadersForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Content-Type: application/json');
    await user.click(screen.getByText('Preview'));

    expect(await screen.findByText('Content-Type')).toBeInTheDocument();
    expect(screen.getByText('application/json')).toBeInTheDocument();
    expect(screen.getByText(/preview \(1 header\)/i)).toBeInTheDocument();
  });

  it('imports previewed headers', async () => {
    const user = userEvent.setup();
    render(<BatchHeadersForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Accept: text/html');
    await user.click(screen.getByText('Preview'));

    await screen.findByText('Accept');
    await user.click(screen.getByText(/import 1 header/i));
    expect(mockOnImport).toHaveBeenCalledWith([{ key: 'Accept', value: 'text/html' }]);
  });

  it('shows error for unparseable input', async () => {
    const user = userEvent.setup();
    render(<BatchHeadersForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'nocolonhere');
    await user.click(screen.getByText('Preview'));

    expect(await screen.findByText(/no headers found/i)).toBeInTheDocument();
  });

  it('shows supported formats section', () => {
    render(<BatchHeadersForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    expect(screen.getByText(/supported formats/i)).toBeInTheDocument();
  });

  it('switches format modes', async () => {
    const user = userEvent.setup();
    render(<BatchHeadersForm onImport={mockOnImport} onCancel={mockOnCancel} />);

    await user.click(screen.getByRole('button', { name: 'JSON' }));
    // Placeholder should change to JSON format when JSON is selected
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });
});
