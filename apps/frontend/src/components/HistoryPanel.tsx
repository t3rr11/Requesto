import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

interface HistoryItem {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
  headers?: Record<string, string>;
  body?: string;
}

interface HistoryPanelProps {
  onSelectRequest: (item: HistoryItem) => void;
  isCollapsed: boolean;
}

export interface HistoryPanelRef {
  refresh: () => void;
}

const HistoryPanel = forwardRef<HistoryPanelRef, HistoryPanelProps>(
  function HistoryPanel({ onSelectRequest, isCollapsed }, ref) {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/history');
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    };

    const clearHistory = async () => {
      if (!confirm('Clear all history?')) return;
      
      try {
        await fetch('/api/history', { method: 'DELETE' });
        setHistory([]);
      } catch (error) {
        console.error('Failed to clear history:', error);
      }
    };

    // Load history on mount
    useEffect(() => {
      loadHistory();
    }, []);

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
      refresh: loadHistory,
    }));

    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        return date.toLocaleTimeString();
      }
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getMethodColor = (method: string) => {
      const colors: Record<string, string> = {
        GET: 'text-green-600 bg-green-50',
        POST: 'text-blue-600 bg-blue-50',
        PUT: 'text-orange-600 bg-orange-50',
        PATCH: 'text-purple-600 bg-purple-50',
        DELETE: 'text-red-600 bg-red-50',
      };
      return colors[method] || 'text-gray-600 bg-gray-50';
    };

    const getStatusColor = (status: number) => {
      if (status === 0) return 'text-red-600';
      if (status >= 200 && status < 300) return 'text-green-600';
      if (status >= 300 && status < 400) return 'text-blue-600';
      if (status >= 400 && status < 500) return 'text-orange-600';
      return 'text-red-600';
    };

    return (
      <div className={`bg-white rounded-lg shadow p-6 transition-all duration-300 ${isCollapsed ? 'w-0 p-0 overflow-hidden' : ''}`}>
        {!isCollapsed && (
          <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">History</h2>
          <div className="flex gap-2">
            <button
              onClick={loadHistory}
              disabled={loading}
              className="text-sm px-3 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No requests yet. Send a request to see it here.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectRequest(item)}
                className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${getMethodColor(item.method)}`}>
                      {item.method}
                    </span>
                    <span className={`text-sm font-semibold ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-gray-500">{item.duration}ms</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(item.timestamp)}
                  </span>
                </div>
                <div className="text-sm text-gray-700 truncate">
                  {item.url}
                </div>
              </button>
            ))}
          </div>
        )}
          </>
        )}
      </div>
    );
  }
);

HistoryPanel.displayName = 'HistoryPanel';

export default HistoryPanel;