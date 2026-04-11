import { useEffect, useRef } from 'react';
import type { SSEEvent } from '../../store/request/types';

interface ResponseBodyStreamingProps {
  events: SSEEvent[];
  status: number;
  statusText: string;
}

function getEventTypeColor(eventType?: string): string {
  switch (eventType) {
    case 'connected':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'complete':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'error':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'message':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-purple-100 text-purple-800 border-purple-200';
  }
}

function formatData(data: string): string {
  try {
    return JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    return data;
  }
}

export function ResponseBodyStreaming({ events, status, statusText }: ResponseBodyStreamingProps) {
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);

  const checkIfAtBottom = () => {
    if (containerRef.current) {
      const c = containerRef.current;
      isUserScrolledUpRef.current = c.scrollHeight - c.scrollTop - c.clientHeight >= 50;
    }
  };

  useEffect(() => {
    if (eventsEndRef.current && !isUserScrolledUpRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events.length]);

  if (status === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{statusText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-linear-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">SSE Stream</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto px-4 py-3" onScroll={checkIfAtBottom}>
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400 dark:text-gray-500">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-sm">Waiting for events...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition-shadow"
              >
                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-400">
                      #{index + 1}
                    </span>
                    {event.event && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium border ${getEventTypeColor(event.event)}`}
                      >
                        {event.event}
                      </span>
                    )}
                    {event.id && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">id: {event.id}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="px-3 py-2">
                  <pre className="text-xs font-mono text-gray-800 dark:text-gray-300 whitespace-pre-wrap wrap-break-words overflow-x-auto">
                    {formatData(event.data)}
                  </pre>
                </div>
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
