import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseBodyStreaming } from '../../components/response/ResponseBodyStreaming';
import type { SSEEvent } from '../../store/request/types';

describe('ResponseBodyStreaming', () => {
  it('shows loading state when status is 0', () => {
    render(<ResponseBodyStreaming events={[]} status={0} statusText="Connecting..." />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('shows waiting message when no events', () => {
    render(<ResponseBodyStreaming events={[]} status={200} statusText="OK" />);
    expect(screen.getByText('Waiting for events...')).toBeInTheDocument();
  });

  it('renders SSE event list', () => {
    const events: SSEEvent[] = [
      { data: '{"msg":"hello"}', event: 'message', timestamp: Date.now() },
      { data: '{"msg":"world"}', event: 'connected', timestamp: Date.now() },
    ];
    render(<ResponseBodyStreaming events={events} status={200} statusText="OK" />);
    expect(screen.getByText('2 events')).toBeInTheDocument();
    expect(screen.getByText('message')).toBeInTheDocument();
    expect(screen.getByText('connected')).toBeInTheDocument();
  });

  it('formats JSON data in events', () => {
    const events: SSEEvent[] = [
      { data: '{"key":"value"}', timestamp: Date.now() },
    ];
    render(<ResponseBodyStreaming events={events} status={200} statusText="OK" />);
    // JSON.stringify with indent produces formatted output
    expect(screen.getByText(/key/)).toBeInTheDocument();
    expect(screen.getByText(/value/)).toBeInTheDocument();
  });

  it('shows event index numbers', () => {
    const events: SSEEvent[] = [
      { data: 'first', timestamp: Date.now() },
      { data: 'second', timestamp: Date.now() },
    ];
    render(<ResponseBodyStreaming events={events} status={200} statusText="OK" />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('shows event ID when present', () => {
    const events: SSEEvent[] = [
      { data: 'test', id: 'evt-42', timestamp: Date.now() },
    ];
    render(<ResponseBodyStreaming events={events} status={200} statusText="OK" />);
    expect(screen.getByText('id: evt-42')).toBeInTheDocument();
  });
});
