import type { ProxyRequest, ProxyResponse, StreamingResponse, SSEEvent } from './types';
import { API_BASE } from '../../helpers/api/config';
import { useSettingsStore } from '../settings/store';
import { useOAuthStore } from '../oauth/store';
import { startOAuthFlow } from '../../helpers/oauth/oauthFlowHandler';

// ── Internal API helpers ─────────────────────────────────────────────────────

function isLikelyStreamingRequest(request: ProxyRequest): boolean {
  const accept = request.headers?.['Accept'] || request.headers?.['accept'] || '';
  return accept.includes('text/event-stream') || request.url.includes('/sse/');
}

/**
 * Result of an attempted re-authentication for a 401 response. The caller
 * uses this to decide whether to retry the request or surface an error.
 */
type ReauthOutcome =
  /** Not an interactive-auth 401, or no configId — don't retry, bubble original error. */
  | { kind: 'not-applicable' }
  /** Re-auth succeeded; caller should retry the request once. */
  | { kind: 'retry' }
  /** Popup ran but auth failed; surface this message to the user instead of the original 401. */
  | { kind: 'failed'; message: string };

/**
 * If the backend rejects a request because no valid OAuth token is available
 * for the configured `configId`, trigger the user-facing flow and report
 * back what happened. Surfaces meaningful errors when the popup ran but the
 * token exchange failed (e.g. PKCE mismatch, redirect_uri mismatch).
 */
async function tryReauthenticateForResponse(res: Response): Promise<ReauthOutcome> {
  if (res.status !== 401) return { kind: 'not-applicable' };
  const cloned = res.clone();
  let payload: { code?: string; configId?: string; error?: string } | null = null;
  try {
    payload = await cloned.json();
  } catch {
    return { kind: 'not-applicable' };
  }
  if (!payload || payload.code !== 'OAUTH_INTERACTIVE_REQUIRED' || !payload.configId) {
    return { kind: 'not-applicable' };
  }

  const oauthStore = useOAuthStore.getState();
  let config = oauthStore.getConfig(payload.configId);
  if (!config) {
    await oauthStore.loadConfigs();
    config = useOAuthStore.getState().getConfig(payload.configId);
  }
  if (!config) {
    return {
      kind: 'failed',
      message: `OAuth configuration not found for id "${payload.configId}". Re-select an OAuth configuration on this request.`,
    };
  }

  const result = await startOAuthFlow(config);
  if (result.success) {
    await useOAuthStore.getState().loadTokenStatus(payload.configId);
    return { kind: 'retry' };
  }

  // Distinguish a user-cancelled popup from an actual exchange failure so the
  // surfaced message is precise.
  if (result.error === 'user_cancelled') {
    return { kind: 'failed', message: 'OAuth authentication was cancelled.' };
  }
  if (result.error === 'redirect_in_progress') {
    // Browser redirected away to the OAuth provider; nothing more to do here.
    return { kind: 'failed', message: 'Redirecting to OAuth provider…' };
  }
  const detail = result.errorDescription || result.error || 'Unknown error';
  // Log full details to the devtools console for diagnostics.
  console.error('[oauth] auto re-auth failed', { configId: payload.configId, result });
  return {
    kind: 'failed',
    message: `OAuth authentication failed: ${detail}`,
  };
}

/**
 * Drive the 401 → re-auth → retry loop. Returns the (possibly retried)
 * Response, or throws an Error with a meaningful message when re-auth ran
 * but did not succeed.
 */
async function withOAuthRetry(doFetch: () => Promise<Response>): Promise<Response> {
  let res = await doFetch();
  if (res.ok) return res;

  const outcome = await tryReauthenticateForResponse(res);
  if (outcome.kind === 'not-applicable') return res;
  if (outcome.kind === 'failed') throw new Error(outcome.message);

  // Successful re-auth → retry exactly once.
  return doFetch();
}

async function sendRequestApi(request: ProxyRequest, signal?: AbortSignal): Promise<ProxyResponse> {
  if (isLikelyStreamingRequest(request)) {
    throw new Error('Streaming requests must use sendStreamingRequest');
  }

  const insecureTls = useSettingsStore.getState().insecureTls;

  const doFetch = () => fetch(`${API_BASE}/proxy/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, insecureTls }),
    signal,
  });

  const res = await withOAuthRetry(doFetch);
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
  const insecureTls = useSettingsStore.getState().insecureTls;

  const doFetch = () => fetch(`${API_BASE}/proxy/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, insecureTls }),
    signal,
  });

  const res = await withOAuthRetry(doFetch);
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
