/**
 * SSE (Server-Sent Events) handler for streaming responses
 */
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
