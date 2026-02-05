import { ProxyRequest, ProxyResponse, StreamingResponse, SSEEvent } from '../../types';
import { prepareAuthenticatedRequest } from '../../helpers/api/authRequest';
import { API_BASE } from '../../helpers/api/config';

// ============================================================================
// Internal API Helper Functions (integrated from helpers/api/request.ts and helpers/api/sse.ts)
// ============================================================================

/**
 * Check if the request is likely to be a streaming response (SSE)
 */
function isLikelyStreamingRequest(request: ProxyRequest): boolean {
  const acceptHeader = request.headers?.['Accept'] || request.headers?.['accept'] || '';
  return acceptHeader.includes('text/event-stream') || request.url.includes('/sse/');
}

/**
 * Send a streaming HTTP request (for SSE) with real-time updates
 */
async function sendStreamingRequestApi(
  request: ProxyRequest,
  updateCallback: (response: StreamingResponse) => void
): Promise<StreamingResponse> {
  const startTime = Date.now();
  const events: SSEEvent[] = [];

  // Prepare request with authentication (inject OAuth tokens if needed)
  const authenticatedRequest = prepareAuthenticatedRequest(request);

  const response = await fetch(`${API_BASE}/proxy/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(authenticatedRequest),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Send initial connecting state
  updateCallback({
    status: response.status,
    statusText: response.statusText,
    headers,
    events: [],
    duration: Date.now() - startTime,
    isStreaming: true,
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

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
          // Empty line indicates end of event
          if (eventData.length > 0) {
            const event: SSEEvent = {
              id: eventId,
              event: eventType,
              data: eventData.join('\n'),
              timestamp: Date.now(),
            };
            events.push(event);
            
            // Update callback with new event immediately
            updateCallback({
              status: response.status,
              statusText: response.statusText,
              headers,
              events: [...events], // Create new array reference to trigger re-render
              duration: Date.now() - startTime,
              isStreaming: true,
            });
          }
          // Reset for next event
          eventId = undefined;
          eventType = undefined;
          eventData = [];
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const duration = Date.now() - startTime;

  const finalResponse: StreamingResponse = {
    status: response.status,
    statusText: response.statusText,
    headers,
    events,
    duration,
    isStreaming: true,
  };

  return finalResponse;
}

/**
 * Send a regular HTTP request via the proxy
 */
async function sendRequestApi(request: ProxyRequest): Promise<ProxyResponse> {
  // Check if this is a streaming request
  if (isLikelyStreamingRequest(request)) {
    throw new Error('Streaming requests must be handled through sendStreamingRequest');
  }

  // Prepare request with authentication (inject OAuth tokens if needed)
  const authenticatedRequest = prepareAuthenticatedRequest(request);

  const response = await fetch(`${API_BASE}/proxy/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(authenticatedRequest),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// SSE Client (integrated from helpers/api/sse.ts)
// ============================================================================

export interface SSEEventHandler {
  onMessage?: (data: string, event?: string) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private url: string;
  private handlers: SSEEventHandler;

  constructor(url: string, handlers: SSEEventHandler) {
    this.url = url;
    this.handlers = handlers;
  }

  /**
   * Connect to the SSE endpoint
   */
  connect(): void {
    if (this.eventSource) {
      this.close();
    }

    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      this.handlers.onOpen?.();
    };

    this.eventSource.onmessage = (event: MessageEvent) => {
      this.handlers.onMessage?.(event.data, event.type);
    };

    this.eventSource.onerror = (error: Event) => {
      this.handlers.onError?.(error);
      this.close();
    };
  }

  /**
   * Close the SSE connection
   */
  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.handlers.onClose?.();
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

/**
 * Create and manage an SSE connection
 */
export const createSSEConnection = (url: string, handlers: SSEEventHandler): SSEClient => {
  const client = new SSEClient(url, handlers);
  client.connect();
  return client;
};

// ============================================================================
// Exported Store Actions
// ============================================================================

/**
 * Send a regular HTTP request via the proxy
 */
export const sendRequest = async (request: ProxyRequest): Promise<ProxyResponse> => {
  try {
    const response = await sendRequestApi(request);
    return response as ProxyResponse;
  } catch (error) {
    console.error('Failed to send request:', error);
    throw error;
  }
};

/**
 * Send a streaming HTTP request (for SSE) with real-time updates
 */
export const sendStreamingRequest = async (
  request: ProxyRequest,
  updateCallback: (response: StreamingResponse) => void
): Promise<StreamingResponse> => {
  try {
    const response = await sendStreamingRequestApi(request, updateCallback);
    return response;
  } catch (error) {
    console.error('Failed to send streaming request:', error);
    throw error;
  }
};

/**
 * Check if the request is likely to be a streaming response
 */
export const isStreamingRequest = (request: ProxyRequest): boolean => {
  return isLikelyStreamingRequest(request);
};
