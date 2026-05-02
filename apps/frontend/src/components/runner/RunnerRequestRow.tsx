import { ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { formatResponseBody, formatBytes } from '../../helpers/response';
import { statusIcon, httpStatusColor } from './helpers';
import type { RequestRunResult, ExpandedTab } from './types';

interface RunnerRequestRowProps {
  result: RequestRunResult;
  idx: number;
  depth: number;
  isExpanded: boolean;
  activeTab: ExpandedTab;
  onToggleExpand: (id: string) => void;
  onSetTab: (id: string, tab: ExpandedTab) => void;
}

export function RunnerRequestRow({
  result,
  idx,
  depth,
  isExpanded,
  activeTab,
  onToggleExpand,
  onSetTab,
}: RunnerRequestRowProps) {
  const { request, status, response, testResults, error, duration } = result;
  const hasDetails = response !== null || !!error;
  const indent = depth * 16;

  return (
    <div
      className="rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
      style={indent > 0 ? { marginLeft: `${indent}px` } : undefined}
    >
      {/* Row header */}
      <div
        className={`flex items-center gap-3 px-3 py-2 ${hasDetails ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
        onClick={() => hasDetails && onToggleExpand(request.id)}
      >
        {/* Expand toggle */}
        <span className="w-4 shrink-0">
          {hasDetails
            ? (isExpanded
                ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />)
            : null}
        </span>

        {/* Status icon */}
        {statusIcon(status)}

        {/* Request number */}
        <span className="text-xs text-gray-400 dark:text-gray-600 shrink-0 w-6 text-right">
          {idx + 1}.
        </span>

        {/* Method badge */}
        <span className={`text-xs font-mono font-bold shrink-0 ${
          request.method === 'GET'    ? 'text-green-600 dark:text-green-400' :
          request.method === 'POST'   ? 'text-blue-600 dark:text-blue-400' :
          request.method === 'PUT'    ? 'text-yellow-600 dark:text-yellow-400' :
          request.method === 'PATCH'  ? 'text-purple-600 dark:text-purple-400' :
          request.method === 'DELETE' ? 'text-red-600 dark:text-red-400' :
          'text-gray-600 dark:text-gray-400'
        }`}>
          {request.method}
        </span>

        {/* Name */}
        <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0">
          {request.name}
        </span>

        {/* URL */}
        <span className="text-xs text-gray-400 dark:text-gray-600 truncate max-w-48 hidden sm:block">
          {request.url}
        </span>

        {/* HTTP status */}
        {response && (
          <span className={`text-xs font-mono font-medium shrink-0 ${httpStatusColor(response.status)}`}>
            {response.status}
          </span>
        )}

        {/* Duration */}
        {duration !== undefined && (
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {duration}ms
          </span>
        )}

        {/* Test summary badge */}
        {testResults.length > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
            testResults.every(t => t.passed)
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {testResults.filter(t => t.passed).length}/{testResults.length}
          </span>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 dark:border-gray-800 px-3">
            <button
              className={`text-xs py-2 px-2 font-medium border-b-2 -mb-px ${
                activeTab === 'tests'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              onClick={() => onSetTab(request.id, 'tests')}
            >
              Tests{testResults.length > 0 ? ` (${testResults.length})` : ''}
            </button>
            <button
              className={`text-xs py-2 px-2 font-medium border-b-2 -mb-px ${
                activeTab === 'response'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              onClick={() => onSetTab(request.id, 'response')}
            >
              Response
            </button>
          </div>

          <div className="px-4 py-3 space-y-2">
            {/* Error (always visible above tabs) */}
            {error && (
              <div className="text-xs text-orange-600 dark:text-orange-400 font-mono bg-orange-50 dark:bg-orange-900/20 rounded p-2">
                {error}
              </div>
            )}

            {/* Tests panel */}
            {activeTab === 'tests' && (
              testResults.length > 0 ? (
                <div className="space-y-1">
                  {testResults.map((t, ti) => (
                    <div key={ti} className="flex items-start gap-2 text-xs">
                      {t.passed
                        ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                      <span className={`font-medium ${t.passed ? 'text-gray-700 dark:text-gray-300' : 'text-red-700 dark:text-red-400'}`}>
                        {t.name}
                      </span>
                      {!t.passed && t.error && (
                        <span className="text-gray-500 dark:text-gray-500 font-mono">— {t.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">No tests defined</p>
              )
            )}

            {/* Response panel */}
            {activeTab === 'response' && response && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Body</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatBytes(new Blob([response.body]).size)}</span>
                  </div>
                  {(() => {
                    const PREVIEW_LIMIT = 50_000;
                    const truncated = response.body.length > PREVIEW_LIMIT;
                    const preview = truncated ? response.body.slice(0, PREVIEW_LIMIT) : response.body;
                    return (
                      <>
                        <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded p-2 whitespace-pre-wrap wrap-break-word overflow-auto max-h-48">
                          {formatResponseBody(preview)}
                        </pre>
                        {truncated && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Preview truncated — showing first {formatBytes(PREVIEW_LIMIT)} of {formatBytes(response.body.length)}.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
                {Object.keys(response.headers).length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Headers</span>
                    <div className="space-y-0.5 bg-gray-50 dark:bg-gray-800 rounded p-2">
                      {Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-xs font-mono">
                          <span className="text-purple-600 dark:text-purple-400 shrink-0">{key}:</span>
                          <span className="text-gray-700 dark:text-gray-300 break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
