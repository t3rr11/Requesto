import { useState, useRef, useEffect, useMemo } from 'react';
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
import { useResizablePanel } from '../hooks/useResizablePanel';
import type { ConsoleLog } from '../store/request/types';

interface ConsolePanelProps {
  isOpen: boolean;
  consoleHeight: number;
  consoleLogs: ConsoleLog[];
  onToggle: () => void;
  onClear: () => void;
  onHeightChange: (height: number) => void;
}

type ConsoleGroup = {
  id: string;
  requestLog?: ConsoleLog;
  responseLog?: ConsoleLog;
  errorLog?: ConsoleLog;
  infoLog?: ConsoleLog;
  timestamp: number;
};

function groupConsoleLogs(logs: ConsoleLog[]): ConsoleGroup[] {
  const groups = new Map<string, ConsoleGroup>();
  const order: string[] = [];

  for (const log of logs) {
    const groupId = log.requestId || log.id;
    if (!groups.has(groupId)) {
      groups.set(groupId, { id: groupId, timestamp: log.timestamp });
      order.push(groupId);
    }
    const group = groups.get(groupId)!;

    switch (log.type) {
      case 'request':
        group.requestLog = log;
        break;
      case 'response':
        group.responseLog = log;
        break;
      case 'error':
        group.errorLog = log;
        break;
      default:
        group.infoLog = log;
        break;
    }
  }

  // Reverse: newest first
  return order.map(id => groups.get(id)!).reverse();
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${time}.${ms}`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatHeaders(headers?: Record<string, string>): string {
  if (!headers || Object.keys(headers).length === 0) return 'No headers';
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function getStatusColor(status?: number): string {
  if (!status) return 'text-gray-400';
  if (status >= 200 && status < 300) return 'text-green-400';
  if (status >= 300 && status < 400) return 'text-yellow-400';
  if (status >= 400 && status < 500) return 'text-orange-400';
  return 'text-red-400';
}

function getGroupIcon(group: ConsoleGroup) {
  if (group.errorLog) return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (group.responseLog) return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (group.requestLog) return <Send className="w-4 h-4 text-blue-500 shrink-0" />;
  return <Info className="w-4 h-4 text-gray-500 shrink-0" />;
}

function getGroupColor(group: ConsoleGroup): string {
  if (group.errorLog) return 'text-red-400';
  if (group.responseLog) return 'text-green-400';
  if (group.requestLog) return 'text-blue-400';
  return 'text-gray-400';
}

const LOG_REFRESH_INTERVAL_MS = 30_000;

function RelativeTime({ timestamp }: { timestamp: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), LOG_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
  return (
    <span
      className="text-gray-600 dark:text-gray-700 text-xs whitespace-nowrap"
      title={new Date(timestamp).toLocaleString()}
    >
      {formatRelativeTime(timestamp)}
    </span>
  );
}

export function ConsolePanel({
  isOpen,
  consoleHeight,
  consoleLogs,
  onToggle,
  onClear,
  onHeightChange,
}: ConsolePanelProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const { handleResizeStart } = useResizablePanel({
    containerRef,
    axis: 'vertical',
    onResize: onHeightChange,
    min: 150,
    max: window.innerHeight - 200,
    origin: 'end',
  });

  const groups = useMemo(() => groupConsoleLogs(consoleLogs), [consoleLogs]);

  const handleToggleLog = (groupId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000);
    } catch {
      // Clipboard access may be denied
    }
  };

  const renderCopyButton = (text: string, key: string) => (
    <Button
      onClick={e => {
        e.stopPropagation();
        handleCopy(text, key);
      }}
      variant="icon"
      size="sm"
      title="Copy"
      className="text-gray-500 dark:text-gray-600 hover:text-gray-300 dark:hover:text-gray-400"
    >
      {copiedStates[key] ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </Button>
  );

  const renderHeaders = (
    headers: Record<string, string> | undefined,
    prefix: string,
    groupId: string,
    highlightAuth = false,
  ) => {
    if (!headers || Object.keys(headers).length === 0) return null;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 dark:text-gray-500 text-xs font-semibold">Headers</span>
          {renderCopyButton(formatHeaders(headers), `${prefix}-headers-${groupId}`)}
        </div>
        <div className="bg-gray-800 dark:bg-black rounded p-2 font-mono text-xs max-h-40 overflow-auto">
          {Object.entries(headers).map(([key, value]) => {
            const isAuth = highlightAuth && key.toLowerCase() === 'authorization';
            return (
              <div key={key} className="py-0.5 flex items-center gap-2">
                <span
                  className={
                    isAuth
                      ? 'text-yellow-300 font-bold'
                      : prefix === 'req'
                        ? 'text-blue-300 dark:text-blue-400'
                        : 'text-green-300'
                  }
                >
                  {key}
                </span>
                <span className="text-gray-500 dark:text-gray-600">: </span>
                <span
                  className={
                    isAuth ? 'text-yellow-200 truncate max-w-64' : 'text-gray-300 dark:text-gray-400'
                  }
                  title={value}
                >
                  {isAuth && value.length > 60 ? value.slice(0, 60) + '…' : value}
                </span>
                {isAuth && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-900/40 text-yellow-200 text-[10px] rounded">
                    AUTH
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBody = (body: string | undefined, prefix: string, groupId: string) => {
    if (!body) return null;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 dark:text-gray-500 text-xs font-semibold">Body</span>
          <div className="flex items-center gap-1">
            {prefix === 'res' && (
              <span className="text-gray-500 text-xs">{new Blob([body]).size} bytes</span>
            )}
            {renderCopyButton(body, `${prefix}-body-${groupId}`)}
          </div>
        </div>
        <div className="bg-gray-800 dark:bg-black rounded p-2 font-mono text-xs max-h-60 overflow-auto">
          <pre className="text-gray-300 dark:text-gray-400 whitespace-pre-wrap wrap-break-word">
            {(() => {
              try {
                return JSON.stringify(JSON.parse(body), null, 2);
              } catch {
                return body;
              }
            })()}
          </pre>
        </div>
      </div>
    );
  };

  const renderGroupEntry = (group: ConsoleGroup) => {
    const isExpanded = expandedLogs.has(group.id);
    const method = group.requestLog?.method || group.responseLog?.method || group.errorLog?.method;
    const url = group.requestLog?.url || group.responseLog?.url || group.errorLog?.url;
    const status = group.responseLog?.status;
    const duration = group.responseLog?.duration;

    return (
      <div key={group.id} className="border-b border-gray-800 dark:border-gray-900">
        {/* Collapsed header row */}
        <div
          className="py-2 px-3 hover:bg-gray-800 dark:hover:bg-gray-900 cursor-pointer flex items-center gap-3"
          onClick={() => handleToggleLog(group.id)}
        >
          <span className="text-gray-500 dark:text-gray-600 text-xs font-mono select-none mt-0.5">
            {formatTime(group.timestamp)}
          </span>
          {getGroupIcon(group)}
          <div className={`flex-1 min-w-0 ${getGroupColor(group)}`}>
            <div className="flex items-center gap-2">
              {method && <span className="font-bold text-xs">{method}</span>}
              {url && (
                <span className="text-gray-300 dark:text-gray-400 text-xs truncate flex-1">
                  {url}
                </span>
              )}
              {status !== undefined && (
                <span className={`font-semibold text-sm ${getStatusColor(status)}`}>
                  {status}
                </span>
              )}
              {duration !== undefined && (
                <span className="text-gray-400 dark:text-gray-500 text-xs">{duration}ms</span>
              )}
              {group.errorLog && !status && (
                <span className="text-red-400 text-xs truncate">{group.errorLog.message}</span>
              )}
            </div>
            {group.infoLog?.message && !url && (
              <div className="text-sm mt-1">{group.infoLog.message}</div>
            )}
          </div>
          <RelativeTime timestamp={group.timestamp} />
          <Button
            variant="icon"
            size="sm"
            className="text-gray-500 dark:text-gray-600 hover:text-gray-300 dark:hover:text-gray-400"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-3 pb-3 pl-20 space-y-3 text-sm">
            {/* Request section */}
            {group.requestLog && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-400 dark:text-blue-300 font-semibold pt-2">
                  <Send className="w-3.5 h-3.5" />
                  <span>Request</span>
                </div>

                {/* Always show method + URL for context */}
                <div className="bg-gray-800 dark:bg-black rounded p-2 font-mono text-xs">
                  <span className="text-blue-300 font-bold">{group.requestLog.method}</span>
                  <span className="text-gray-300 dark:text-gray-400 ml-2 break-all">
                    {group.requestLog.url}
                  </span>
                </div>

                {group.requestLog.requestData && (
                  <>
                    {renderHeaders(group.requestLog.requestData.headers, 'req', group.id, true)}
                    {group.requestLog.requestData.bodyType && group.requestLog.requestData.bodyType !== 'json' && group.requestLog.requestData.formDataEntries && group.requestLog.requestData.formDataEntries.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-gray-400 dark:text-gray-500 text-xs font-semibold">
                          Body ({group.requestLog.requestData.bodyType})
                        </span>
                        <div className="bg-gray-800 dark:bg-black rounded p-2 font-mono text-xs max-h-60 overflow-auto">
                          {group.requestLog.requestData.formDataEntries.map((entry, i) => (
                            <div key={i} className="text-gray-300 dark:text-gray-400">
                              <span className="text-blue-400">{entry.key}</span>
                              <span className="text-gray-500">: </span>
                              <span>{entry.type === 'file' ? `[file] ${entry.fileName || ''}` : entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      renderBody(group.requestLog.requestData.body, 'req', group.id)
                    )}
                    {(!group.requestLog.requestData.headers ||
                      Object.keys(group.requestLog.requestData.headers).length === 0) &&
                      !group.requestLog.requestData.body &&
                      (!group.requestLog.requestData.formDataEntries || group.requestLog.requestData.formDataEntries.length === 0) && (
                        <div className="text-gray-500 dark:text-gray-600 text-xs italic">
                          No headers or body
                        </div>
                      )}
                  </>
                )}
              </div>
            )}

            {/* Response section */}
            {group.responseLog?.responseData && (
              <div className="space-y-2 border-t border-gray-700 dark:border-gray-800 pt-3">
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Response</span>
                  <span className={`text-xs ${getStatusColor(group.responseLog.responseData.status)}`}>
                    {group.responseLog.responseData.status} {group.responseLog.responseData.statusText}
                  </span>
                  {group.responseLog.duration !== undefined && (
                    <span className="text-gray-500 dark:text-gray-600 text-xs">
                      ({group.responseLog.duration}ms)
                    </span>
                  )}
                </div>

                {renderHeaders(group.responseLog.responseData.headers, 'res', group.id)}

                {'body' in group.responseLog.responseData && group.responseLog.responseData.body && (
                  renderBody(group.responseLog.responseData.body, 'res', group.id)
                )}

                {'isStreaming' in group.responseLog.responseData &&
                  group.responseLog.responseData.isStreaming && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 dark:text-gray-500 text-xs font-semibold">
                          SSE Events
                        </span>
                        <span className="text-gray-500 text-xs">
                          {group.responseLog.responseData.events.length} events
                        </span>
                      </div>
                      <div className="bg-gray-800 dark:bg-black rounded p-2 font-mono text-xs max-h-60 overflow-auto">
                        <pre className="text-gray-300 dark:text-gray-400 whitespace-pre-wrap wrap-break-word">
                          {JSON.stringify(group.responseLog.responseData.events, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Error section */}
            {group.errorLog && (
              <div className="space-y-2 border-t border-gray-700 dark:border-gray-800 pt-3">
                <div className="flex items-center gap-2 text-red-400 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Error</span>
                </div>
                <div className="bg-red-900/20 border border-red-800/50 rounded p-3 text-red-300 text-xs font-mono">
                  {group.errorLog.message}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 bg-gray-800 dark:bg-gray-900 text-white px-4 py-2 flex items-center justify-between shadow-lg cursor-pointer hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors z-10 dark:border-t dark:border-gray-700"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="text-sm font-medium">Console</span>
          {groups.length > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {groups.length}
            </span>
          )}
        </div>
        <ChevronUp className="w-4 h-4" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 bg-gray-900 dark:bg-black text-white flex flex-col shadow-2xl z-10"
      style={{ height: `${consoleHeight}px` }}
    >
      <div
        className="h-1 bg-gray-200 dark:bg-gray-700 hover:bg-orange-500 cursor-row-resize shrink-0"
        onMouseDown={handleResizeStart}
      />

      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700 dark:border-gray-800 shrink-0 cursor-pointer hover:bg-gray-750 dark:hover:bg-gray-800" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="text-sm font-medium">Console</span>
          {groups.length > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {groups.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={e => {
              e.stopPropagation();
              onClear();
            }}
            variant="icon"
            size="sm"
            title="Clear console"
            className="text-gray-400 hover:text-white"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
            variant="icon"
            size="sm"
            title="Close console"
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-600">
            <div className="text-center">
              <Terminal className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No console output yet</p>
            </div>
          </div>
        ) : (
          groups.map(group => renderGroupEntry(group))
        )}
      </div>
    </div>
  );
}
