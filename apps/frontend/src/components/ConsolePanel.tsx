import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';
import { useRequestStore } from '../store/useRequestStore';
import { Terminal, X, ChevronUp, Trash2 } from 'lucide-react';

export const ConsolePanel = () => {
  const { isConsoleOpen, toggleConsole, consoleHeight, setConsoleHeight } = useUIStore();
  const { consoleLogs, clearConsoleLogs } = useRequestStore();
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (isConsoleOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs, isConsoleOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      const clampedHeight = Math.max(150, Math.min(newHeight, containerRect.height - 200));
      setConsoleHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setConsoleHeight]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'request':
        return '➡️';
      case 'response':
        return '✅';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-600';
      case 'request':
        return 'text-blue-600';
      case 'response':
        return 'text-green-600';
      case 'info':
      default:
        return 'text-gray-600';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  if (!isConsoleOpen) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white px-4 py-2 flex items-center justify-between shadow-lg cursor-pointer hover:bg-gray-700 transition-colors z-10"
        onClick={toggleConsole}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="text-sm font-medium">Console</span>
          {consoleLogs.length > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{consoleLogs.length}</span>
          )}
        </div>
        <ChevronUp className="w-4 h-4" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-100 flex flex-col shadow-2xl z-10"
      style={{ height: `${consoleHeight}px` }}
    >
      {/* Resize Handle */}
      <div
        className="h-1 bg-gray-700 hover:bg-orange-500 cursor-ns-resize transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 cursor-pointer hover:bg-gray-750"
        onClick={toggleConsole}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="text-sm font-medium">Console</span>
          {consoleLogs.length > 0 && (
            <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">
              {consoleLogs.length} {consoleLogs.length === 1 ? 'log' : 'logs'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              clearConsoleLogs();
            }}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Clear Console"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              toggleConsole();
            }}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Close Console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Content */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {consoleLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No logs yet</p>
              <p className="text-xs mt-1">Request logs will appear here</p>
            </div>
          </div>
        ) : (
          <>
            {consoleLogs.map(log => (
              <div key={log.id} className="py-1 px-2 hover:bg-gray-800 rounded flex gap-3 items-start">
                <span className="text-gray-500 select-none">{formatTime(log.timestamp)}</span>
                <span className="select-none">{getLogIcon(log.type)}</span>
                <div className={`flex-1 ${getLogColor(log.type)}`}>
                  {log.method && log.url && (
                    <div>
                      <span className="font-bold">{log.method}</span> {log.url}
                      {log.status !== undefined && (
                        <span
                          className={`ml-2 ${log.status >= 200 && log.status < 300 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {log.status}
                        </span>
                      )}
                      {log.duration !== undefined && <span className="ml-2 text-gray-400">{log.duration}ms</span>}
                    </div>
                  )}
                  {log.message && <div>{log.message}</div>}
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>
    </div>
  );
};
