import { useEffect, useRef } from 'react';
import { SSEEvent } from '../../types';

interface ResponseBodyStreamingProps {
  events: SSEEvent[];
  status: number;
  statusText: string;
}

export function ResponseBodyStreaming({ events, status, statusText }: ResponseBodyStreamingProps) {
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);

  // Check if user is scrolled to bottom
  const checkIfAtBottom = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const threshold = 50; // pixels from bottom
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      isUserScrolledUpRef.current = !isAtBottom;
    }
  };

  // Auto-scroll to bottom when new events arrive (only if user hasn't scrolled up)
  useEffect(() => {
    if (eventsEndRef.current && !isUserScrolledUpRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events.length]); // Trigger on event count change

  const getEventTypeColor = (eventType?: string) => {
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
  };

  const formatData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  };

  if (status === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-sm text-gray-600">{statusText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">SSE Stream</span>
          <span className="text-xs text-gray-500">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
        </div>
      </div>

      {/* Events List */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-auto px-4 py-3"
        onScroll={checkIfAtBottom}
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-sm">Waiting for events...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, index) => (
              <div
                key={index}
                className="bg-white rounded border border-gray-200 shadow-sm hover:shadow transition-shadow"
              >
                {/* Event Header */}
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-gray-600">
                      #{index + 1}
                    </span>
                    {event.event && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium border ${getEventTypeColor(
                          event.event
                        )}`}
                      >
                        {event.event}
                      </span>
                    )}
                    {event.id && (
                      <span className="text-xs text-gray-500 font-mono">
                        id: {event.id}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Event Data */}
                <div className="px-3 py-2">
                  <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words overflow-x-auto">
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
