import { ProxyRequest, ProxyResponse, StreamingResponse, SSEEvent } from '../../types';
import { prepareAuthenticatedRequest } from './authRequest';
import { API_BASE } from './config';

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
export const sendStreamingRequest = async (
  request: ProxyRequest,
  updateCallback: (response: StreamingResponse) => void
): Promise<StreamingResponse> => {
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
};

/**
 * Send an HTTP request via the proxy
 */
export const sendRequest = async (request: ProxyRequest): Promise<ProxyResponse | StreamingResponse> => {
  // Check if this is a streaming request
  if (isLikelyStreamingRequest(request)) {
    // For streaming, we need access to the tab store to update progressively
    // This will be handled differently - just return the final result here
    throw new Error('Streaming requests must be handled through sendStreamingWithUpdates');
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
};

export const requestApi = {
  send: sendRequest,
  sendStreaming: sendStreamingRequest,
  isStreaming: isLikelyStreamingRequest,
};
