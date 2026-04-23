import type { ProxyRequest, ProxyResponse, StreamingResponse, SSEEvent } from './types';
import { prepareAuthenticatedRequest } from '../../helpers/api/authRequest';
import { API_BASE } from '../../helpers/api/config';
import { useSettingsStore } from '../settings/store';

// ── Internal API helpers ─────────────────────────────────────────────────────

function isLikelyStreamingRequest(request: ProxyRequest): boolean {
  const accept = request.headers?.['Accept'] || request.headers?.['accept'] || '';
  return accept.includes('text/event-stream') || request.url.includes('/sse/');
}

async function sendRequestApi(request: ProxyRequest, signal?: AbortSignal): Promise<ProxyResponse> {
  if (isLikelyStreamingRequest(request)) {
    throw new Error('Streaming requests must use sendStreamingRequest');
  }

  const authenticated = prepareAuthenticatedRequest(request);
  const insecureTls = useSettingsStore.getState().insecureTls;
  const res = await fetch(`${API_BASE}/proxy/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...authenticated, insecureTls }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let errorMessage = `HTTP error! status: ${res.status}`;
    if (text) {
      try {
        const parsed = JSON.parse(text);
        errorMessage = parsed.message || parsed.error || text;
      } catch {
        errorMessage = text;
      }
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

async function sendStreamingRequestApi(
  request: ProxyRequest,
  onUpdate: (response: StreamingResponse) => void,
  signal?: AbortSignal,
): Promise<StreamingResponse> {
  const startTime = Date.now();
  const events: SSEEvent[] = [];
  const authenticated = prepareAuthenticatedRequest(request);
  const insecureTls = useSettingsStore.getState().insecureTls;

  const res = await fetch(`${API_BASE}/proxy/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...authenticated, insecureTls }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key] = value;
  });

  onUpdate({
    status: res.status,
    statusText: res.statusText,
    headers,
    events: [],
    duration: Date.now() - startTime,
    isStreaming: true,
  });

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error('No response body');

  let buffer = '';
  let eventId: string | undefined;
  let eventType: string | undefined;
  let eventData: string[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('id:')) {
          eventId = line.slice(3).trim();
        } else if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          eventData.push(line.slice(5).trim());
        } else if (line === '') {
          if (eventData.length > 0) {
            const event: SSEEvent = {
              id: eventId,
              event: eventType,
              data: eventData.join('\n'),
              timestamp: Date.now(),
            };
            events.push(event);
            onUpdate({
              status: res.status,
              statusText: res.statusText,
              headers,
              events: [...events],
              duration: Date.now() - startTime,
              isStreaming: true,
            });
          }
          eventId = undefined;
          eventType = undefined;
          eventData = [];
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    status: res.status,
    statusText: res.statusText,
    headers,
    events,
    duration: Date.now() - startTime,
    isStreaming: true,
  };
}

// ── SSE Client ───────────────────────────────────────────────────────────────

export type SSEEventHandler = {
  onMessage?: (data: string, event?: string) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export class SSEClient {
  private eventSource: EventSource | null = null;

  constructor(
    private url: string,
    private handlers: SSEEventHandler,
  ) {}

  connect(): void {
    if (this.eventSource) this.close();
    this.eventSource = new EventSource(this.url);
    this.eventSource.onopen = () => this.handlers.onOpen?.();
    this.eventSource.onmessage = (e: MessageEvent) => this.handlers.onMessage?.(e.data, e.type);
    this.eventSource.onerror = (e: Event) => {
      this.handlers.onError?.(e);
      this.close();
    };
  }

  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.handlers.onClose?.();
    }
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

export function createSSEConnection(url: string, handlers: SSEEventHandler): SSEClient {
  const client = new SSEClient(url, handlers);
  client.connect();
  return client;
}

// ── Exported store actions ───────────────────────────────────────────────────

export async function sendRequest(request: ProxyRequest, signal?: AbortSignal): Promise<ProxyResponse> {
  try {
    return await sendRequestApi(request, signal);
  } catch (error) {
    console.error('Failed to send request:', error);
    throw error;
  }
}

export async function sendStreamingRequest(
  request: ProxyRequest,
  onUpdate: (response: StreamingResponse) => void,
  signal?: AbortSignal,
): Promise<StreamingResponse> {
  try {
    return await sendStreamingRequestApi(request, onUpdate, signal);
  } catch (error) {
    console.error('Failed to send streaming request:', error);
    throw error;
  }
}

export function isStreamingRequest(request: ProxyRequest): boolean {
  return isLikelyStreamingRequest(request);
}
