import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';
import { useRequestStore, ConsoleLog } from '../store/useRequestStore';
import {
  Terminal,
  X,
  ChevronUp,
  Trash2,
  ChevronDown,
  ChevronRight,
  Send,
  CheckCircle2,
  AlertCircle,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from './Button';

export const ConsolePanel = () => {
  const { isConsoleOpen, toggleConsole, consoleHeight, setConsoleHeight } = useUIStore();
  const { consoleLogs, clearConsoleLogs } = useRequestStore();
  const [isResizing, setIsResizing] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (isConsoleOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs, isConsoleOpen]);

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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
        return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
      case 'request':
        return <Send className="w-4 h-4 text-blue-500 flex-shrink-0" />;
      case 'response':
        return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-gray-500 flex-shrink-0" />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'request':
        return 'text-blue-400';
      case 'response':
        return 'text-green-400';
      case 'info':
      default:
        return 'text-gray-400';
    }
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-gray-400';
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    if (status >= 400 && status < 500) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as any);
  };

  const formatHeaders = (headers?: Record<string, string>) => {
    if (!headers || Object.keys(headers).length === 0) return 'No headers';
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };

  const renderLogDetails = (log: ConsoleLog) => {
    const isExpanded = expandedLogs.has(log.id);

    return (
      <div key={log.id} className="border-b border-gray-800 dark:border-gray-900">
        {/* Log Header */}
        <div
          className="py-2 px-3 hover:bg-gray-800 dark:hover:bg-gray-900 cursor-pointer flex items-center gap-3"
          onClick={() => toggleLogExpanded(log.id)}
        >
          <span className="text-gray-500 dark:text-gray-600 text-xs font-mono select-none mt-0.5">
            {formatTime(log.timestamp)}
          </span>
          {getLogIcon(log.type)}
          <div className={`flex-1 ${getLogColor(log.type)}`}>
            <div className="flex items-center gap-2">
              {log.method && <span className="font-bold text-xs">{log.method}</span>}
              {log.url && <span className="text-gray-300 dark:text-gray-400 text-xs truncate flex-1">{log.url}</span>}
              {log.status !== undefined && (
                <span className={`font-semibold text-sm ${getStatusColor(log.status)}`}>{log.status}</span>
              )}
              {log.duration !== undefined && (
                <span className="text-gray-400 dark:text-gray-500 text-xs">{log.duration}ms</span>
              )}
            </div>
            {log.message && !log.url && <div className="text-sm mt-1">{log.message}</div>}
          </div>
          <Button variant="icon" size="sm" className="text-gray-500 dark:text-gray-600 hover:text-gray-300 dark:hover:text-gray-400">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-3 pb-3 pl-20 space-y-3 text-sm">
            {/* Request Details */}
            {log.requestData && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-400 dark:text-blue-300 font-semibold pt-2">
                  <span>Request</span>
                </div>

                {/* Request Headers */}
                {log.requestData.headers && Object.keys(log.requestData.headers).length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 dark:text-gray-500 text-xs font-semibold">Headers</span>
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          copyToClipboard(formatHeaders(log.requestData?.headers), `req-headers-${log.id}`);
                        }}
                        variant="icon"
                        size="sm"
                        title="Copy headers"
                        className="text-gray-500 dark:text-gray-600 hover:text-gray-300 dark:hover:text-gray-400"
                      >
                        {copiedStates[`req-headers-${log.id}`] ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <div className="bg-gray-800 dark:bg-black rounded p-2 font-mono text-xs max-h-40 overflow-auto scrollbar-dark">
                      {Object.entries(log.requestData.headers).map(([key, value]) => {
                        const isAuth = key.toLowerCase() === 'authorization';
                        return (
                          <div key={key} className="py-0.5 flex items-center gap-2">
                            <span className={isAuth ? "text-yellow-300 font-bold" : "text-blue-300 dark:text-blue-400"}>{key}</span>
                            <span className="text-gray-500 dark:text-gray-600">: </span>
                            <span className={isAuth ? "text-yellow-200 truncate max-w-[16rem]" : "text-gray-300 dark:text-gray-400"} title={value}>
                              {isAuth ? (value.length > 60 ? value.slice(0, 60) + '…' : value) : value}
                            </span>
                            {isAuth && (
                              <span className="ml-2 px-2 py-0.5 bg-yellow-900/40 text-yellow-200 text-[10px] rounded">AUTH</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Request Body */}
                {log.requestData.body && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs font-semibold">Body</span>
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          copyToClipboard(log.requestData?.body || '', `req-body-${log.id}`);
                        }}
                        variant="icon"
                        size="sm"
                        title="Copy body"
                        className="text-gray-500 hover:text-gray-300"
                      >
                        {copiedStates[`req-body-${log.id}`] ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <div className="bg-gray-800 rounded p-2 font-mono text-xs max-h-60 overflow-auto scrollbar-dark">
                      <pre className="text-gray-300 whitespace-pre-wrap break-words">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(log.requestData.body!), null, 2);
                          } catch {
                            return log.requestData.body;
                          }
                        })()}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Request Auth */}
                {log.requestData.auth && log.requestData.auth.type !== 'none' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs font-semibold">Auth</span>
                      {log.requestData.auth.type === 'oauth' && log.requestData.auth.oauth?.tokens?.accessToken && (
                        <Button
                          onClick={e => {
                            e.stopPropagation();
                            copyToClipboard(log.requestData?.auth?.oauth?.tokens?.accessToken || '', `auth-token-${log.id}`);
                          }}
                          variant="icon"
                          size="sm"
                          title="Copy access token"
                          className="text-gray-500 hover:text-gray-300"
                        >
                          {copiedStates[`auth-token-${log.id}`] ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="bg-gray-800 rounded p-2 font-mono text-xs space-y-2">
                      <div>
                        <span className="text-purple-400">{log.requestData.auth.type}</span>
                      </div>
                      {log.requestData.auth.type === 'oauth' && log.requestData.auth.oauth && (
                        <>
                          {log.requestData.auth.oauth.tokens?.accessToken ? (
                            <div className="space-y-1">
                              <div className="text-green-400 text-xs">✓ Authenticated</div>
                              <div className="bg-gray-900 rounded p-2 break-all text-yellow-300">
                                <span className="text-gray-500">Bearer </span>
                                {log.requestData.auth.oauth.tokens.accessToken}
                              </div>
                              {log.requestData.auth.oauth.tokens.expiresAt && (
                                <div className="text-gray-500 text-[10px]">
                                  Expires: {new Date(log.requestData.auth.oauth.tokens.expiresAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-yellow-400 text-xs">⚠ No token available (configId: {log.requestData.auth.oauth.configId})</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Response Details */}
            {log.responseData && (
              <div className="space-y-2 border-t border-gray-700 pt-3">
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <span>Response</span>
                  <span className={`text-xs ${getStatusColor(log.responseData.status)}`}>
                    {log.responseData.status} {log.responseData.statusText}
                  </span>
                </div>

                {/* Response Headers */}
                {log.responseData.headers && Object.keys(log.responseData.headers).length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs font-semibold">Headers</span>
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          copyToClipboard(formatHeaders(log.responseData?.headers), `res-headers-${log.id}`);
                        }}
                        variant="icon"
                        size="sm"
                        title="Copy headers"
                        className="text-gray-500 hover:text-gray-300"
                      >
                        {copiedStates[`res-headers-${log.id}`] ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <div className="bg-gray-800 rounded p-2 font-mono text-xs max-h-40 overflow-auto scrollbar-dark">
                      {Object.entries(log.responseData.headers).map(([key, value]) => (
                        <div key={key} className="py-0.5">
                          <span className="text-green-300">{key}</span>
                          <span className="text-gray-500">: </span>
                          <span className="text-gray-300">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response Body */}
                {log.responseData && 'body' in log.responseData && log.responseData.body && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs font-semibold">Body</span>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-xs">{new Blob([log.responseData.body]).size} bytes</span>
                        <Button
                          onClick={e => {
                            e.stopPropagation();
                            copyToClipboard(
                              'body' in log.responseData! ? log.responseData.body || '' : '',
                              `res-body-${log.id}`
                            );
                          }}
                          variant="icon"
                          size="sm"
                          title="Copy body"
                          className="text-gray-500 hover:text-gray-300"
                        >
                          {copiedStates[`res-body-${log.id}`] ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded p-2 font-mono text-xs max-h-60 overflow-auto scrollbar-dark">
                      <pre className="text-gray-300 whitespace-pre-wrap break-words">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(log.responseData.body), null, 2);
                          } catch {
                            return log.responseData.body;
                          }
                        })()}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Streaming Events */}
                {log.responseData && 'isStreaming' in log.responseData && log.responseData.isStreaming && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs font-semibold">SSE Events</span>
                      <span className="text-gray-500 text-xs">{log.responseData.events.length} events</span>
                    </div>
                    <div className="bg-gray-800 rounded p-2 font-mono text-xs max-h-60 overflow-auto scrollbar-dark">
                      <pre className="text-gray-300 whitespace-pre-wrap break-words">
                        {JSON.stringify(log.responseData.events, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isConsoleOpen) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 bg-gray-800 dark:bg-gray-900 text-white px-4 py-2 flex items-center justify-between shadow-lg cursor-pointer hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors z-10 dark:border-t dark:border-gray-700"
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
      className="fixed bottom-0 left-0 right-0 bg-gray-900 dark:bg-black text-gray-100 dark:text-gray-200 flex flex-col shadow-2xl z-10"
      style={{ height: `${consoleHeight}px` }}
    >
      {/* Resize Handle */}
      <div
        className="h-1 bg-gray-700 dark:bg-gray-800 hover:bg-orange-500 cursor-ns-resize transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-950 border-b border-gray-700 dark:border-gray-800 cursor-pointer hover:bg-gray-750 dark:hover:bg-gray-900"
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
          <Button
            onClick={e => {
              e.stopPropagation();
              clearConsoleLogs();
            }}
            variant="icon"
            size="sm"
            title="Clear Console"
            className="hover:bg-gray-700 dark:hover:bg-gray-800"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={e => {
              e.stopPropagation();
              toggleConsole();
            }}
            variant="icon"
            size="sm"
            title="Close Console"
            className="hover:bg-gray-700 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Logs Content */}
      <div className="flex-1 overflow-y-auto font-mono text-xs scrollbar-dark">
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
            {consoleLogs.map(log => renderLogDetails(log))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>
    </div>
  );
};
