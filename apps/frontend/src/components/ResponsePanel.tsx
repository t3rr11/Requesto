import { useState, type ReactElement } from 'react';
import { Loader2, AlertTriangle, Send, Download } from 'lucide-react';
import { getStatusBadgeColor, formatBytes, downloadResponseBody } from '../helpers/response';
import { ResponseBody } from './response/ResponseBody';
import { ResponseHeaders } from './response/ResponseHeaders';
import { ResponseTests } from './response/ResponseTests';
import { Button } from './Button';
import type { ProxyResponse, StreamingResponse } from '../store/request/types';
import type { TestResult } from '../helpers/scriptRunner';

type ResponseTab = 'body' | 'headers' | 'test-results';

interface ResponsePanelProps {
  response: ProxyResponse | StreamingResponse | null;
  loading: boolean;
  error: string | null;
  isDarkMode: boolean;
  testResults?: TestResult[];
  requestUrl?: string;
}

function renderTabLabel(tab: ResponseTab, testResults: TestResult[] | undefined): string | ReactElement {
  if (tab !== 'test-results') {
    return tab.charAt(0).toUpperCase() + tab.slice(1);
  }

  if (!testResults || testResults.length === 0) {
    return 'Test Results';
  }

  const passed = testResults.filter(r => r.passed).length;
  const allPassed = passed === testResults.length;

  return (
    <span className="flex items-center gap-1.5">
      Test Results
      <span
        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-medium ${
          allPassed
            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
            : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
        }`}
      >
        {passed}/{testResults.length}
      </span>
    </span>
  );
}

export function ResponsePanel({ response, loading, error, isDarkMode, testResults, requestUrl }: ResponsePanelProps) {
  const [activeResponseTab, setActiveResponseTab] = useState<ResponseTab>('body');

  const isStreaming = response && 'isStreaming' in response && response.isStreaming;
  const streamingResponse = isStreaming ? (response as StreamingResponse) : null;
  const responseSize = isStreaming
    ? new Blob([JSON.stringify(streamingResponse!.events)]).size
    : response && 'body' in response && response.body
      ? new Blob([response.body]).size
      : 0;

  if (loading && !(isStreaming && streamingResponse!.events.length > 0)) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-800 flex items-center h-12">
          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">Response</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Sending Request</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Waiting for response...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-800 flex items-center h-12">
          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">Response</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg px-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Request Failed</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-800 flex items-center h-12">
          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">Response</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Send className="w-6 h-6 text-gray-400 dark:text-gray-500 rotate-45 -ml-1" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No Response Yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Send a request to see the response</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs: ResponseTab[] = ['body', 'headers', 'test-results'];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-h-0">
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-800 flex items-center h-12 shrink-0">
        <div className="flex items-center justify-between w-full">
          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
            Response{' '}
            {isStreaming && (
              <span className="text-blue-600 dark:text-blue-400">(SSE Stream)</span>
            )}
          </h3>
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-2 py-1 rounded font-medium ${getStatusBadgeColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Time:</span> {response.duration}ms
            </span>
            {isStreaming ? (
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Events:</span> {streamingResponse!.events.length}
              </span>
            ) : (
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Size:</span> {formatBytes(responseSize)}
              </span>
            )}
            {!isStreaming && (response as ProxyResponse).body && (
              <Button
                onClick={() => downloadResponseBody(response as ProxyResponse, requestUrl)}
                variant="ghost"
                size="sm"
                title="Download response body"
                className="flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex px-6">
          {tabs.map(tab => (
            <Button
              key={tab}
              onClick={() => setActiveResponseTab(tab)}
              variant="ghost"
              size="md"
              className={`px-4 py-3 text-sm font-medium capitalize rounded-none border-b-2 ${
                activeResponseTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {renderTabLabel(tab, testResults)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeResponseTab === 'body' && <ResponseBody response={response} isDarkMode={isDarkMode} />}
        {activeResponseTab === 'headers' && <ResponseHeaders headers={response.headers} />}
        {activeResponseTab === 'test-results' && <ResponseTests testResults={testResults} />}
      </div>
    </div>
  );
}
