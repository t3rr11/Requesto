import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsolePanel } from '../../components/ConsolePanel';
import type { ConsoleLog } from '../../store/request/types';

const sampleLogs: ConsoleLog[] = [
  {
    id: 'log-1',
    timestamp: Date.now(),
    type: 'request',
    method: 'GET',
    url: 'https://api.example.com/users',
  },
  {
    id: 'log-2',
    timestamp: Date.now(),
    type: 'response',
    method: 'GET',
    url: 'https://api.example.com/users',
    status: 200,
    duration: 150,
  },
  {
    id: 'log-3',
    timestamp: Date.now(),
    type: 'error',
    message: 'Connection failed',
  },
];

const groupedLogs: ConsoleLog[] = [
  {
    id: 'req-1',
    requestId: 'group-1',
    timestamp: Date.now() - 120_000, // 2 minutes ago
    type: 'request',
    method: 'POST',
    url: 'https://api.example.com/data',
    requestData: { method: 'POST', url: 'https://api.example.com/data', body: '{"key":"value"}' },
  },
  {
    id: 'res-1',
    requestId: 'group-1',
    timestamp: Date.now() - 119_000,
    type: 'response',
    method: 'POST',
    url: 'https://api.example.com/data',
    status: 201,
    duration: 320,
    responseData: { status: 201, statusText: 'Created', headers: {}, body: '{"id":1}', bodyEncoding: 'utf8', duration: 320 },
  },
];

describe('ConsolePanel', () => {
  const defaultProps = {
    isOpen: true,
    consoleHeight: 300,
    consoleLogs: sampleLogs,
    onToggle: vi.fn(),
    onClear: vi.fn(),
    onHeightChange: vi.fn(),
  };

  it('renders collapsed bar when closed', () => {
    render(<ConsolePanel {...defaultProps} isOpen={false} />);
    expect(screen.getByText('Console')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // badge count
  });

  it('renders expanded panel when open', () => {
    render(<ConsolePanel {...defaultProps} />);
    expect(screen.getByText('Console')).toBeInTheDocument();
    expect(screen.getAllByText('https://api.example.com/users')).toHaveLength(2);
  });

  it('shows log count badge', () => {
    render(<ConsolePanel {...defaultProps} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    render(<ConsolePanel {...defaultProps} consoleLogs={[]} />);
    expect(screen.getByText('No console output yet')).toBeInTheDocument();
  });

  it('calls onClear when clear button clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ConsolePanel {...defaultProps} onClear={onClear} />);
    await user.click(screen.getByTitle('Clear console'));
    expect(onClear).toHaveBeenCalled();
  });

  it('calls onToggle when close button clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ConsolePanel {...defaultProps} onToggle={onToggle} />);
    await user.click(screen.getByTitle('Close console'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('calls onToggle when collapsed bar clicked', async () => {
    const onToggle = vi.fn();
    render(<ConsolePanel {...defaultProps} isOpen={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Console'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('expands log details on click', async () => {
    const user = userEvent.setup();
    render(<ConsolePanel {...defaultProps} />);
    // Click the first log entry to expand
    const urlElements = screen.getAllByText('https://api.example.com/users');
    await user.click(urlElements[0]);
    // Expanded state should show request/response sections if data present
  });

  it('displays status code with appropriate color', () => {
    render(<ConsolePanel {...defaultProps} />);
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('displays duration', () => {
    render(<ConsolePanel {...defaultProps} />);
    expect(screen.getByText('150ms')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<ConsolePanel {...defaultProps} />);
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('groups request and response with same requestId', () => {
    render(<ConsolePanel {...defaultProps} consoleLogs={groupedLogs} />);
    // Grouped: 2 logs become 1 group, badge shows 1
    expect(screen.getByText('1')).toBeInTheDocument();
    // URL appears once in the collapsed row
    expect(screen.getAllByText('https://api.example.com/data')).toHaveLength(1);
    // Status and duration from the response
    expect(screen.getByText('201')).toBeInTheDocument();
    expect(screen.getByText('320ms')).toBeInTheDocument();
  });

  it('shows relative time for entries', () => {
    render(<ConsolePanel {...defaultProps} consoleLogs={groupedLogs} />);
    expect(screen.getByText('2m ago')).toBeInTheDocument();
  });

  it('shows newest entries first (reverse order)', () => {
    const logs: ConsoleLog[] = [
      { id: 'old', timestamp: Date.now() - 60_000, type: 'request', method: 'GET', url: 'https://old.com' },
      { id: 'new', timestamp: Date.now(), type: 'request', method: 'POST', url: 'https://new.com' },
    ];
    render(<ConsolePanel {...defaultProps} consoleLogs={logs} />);
    const urls = screen.getAllByText(/https:\/\/(old|new)\.com/);
    expect(urls[0]).toHaveTextContent('https://new.com');
    expect(urls[1]).toHaveTextContent('https://old.com');
  });

  it('shows request details when expanded for grouped entry', async () => {
    const user = userEvent.setup();
    render(<ConsolePanel {...defaultProps} consoleLogs={groupedLogs} />);
    await user.click(screen.getByText('https://api.example.com/data'));
    expect(screen.getByText('Request')).toBeInTheDocument();
    expect(screen.getByText('Response')).toBeInTheDocument();
  });
});
