import { useState } from 'react';
import { getStatusBadgeColor, formatBytes } from '../helpers/responseHelpers';
import { ResponseBody } from './response/ResponseBody';
import { ResponseHeaders } from './response/ResponseHeaders';
import { ResponseTests } from './response/ResponseTests';
import { useTabsStore } from '../store/tabs';
import { Button } from './Button';

type ResponseTab = 'body' | 'headers' | 'test-results';

export function ResponsePanel() {
  const { getActiveTab } = useTabsStore();
  const activeTab = getActiveTab();
  
  const response = activeTab?.response || null;
  const loading = activeTab?.isLoading || false;
  const error = activeTab?.error || null;
  
  const [activeResponseTab, setActiveResponseTab] = useState<ResponseTab>('body');
  
  const isStreaming = response && 'isStreaming' in response && response.isStreaming;
  const responseSize = isStreaming 
    ? new Blob([JSON.stringify(response.events)]).size 
    : (response && 'body' in response && response.body ? new Blob([response.body]).size : 0);

  // Don't show loading screen if we're streaming and already have events coming in
  if (loading && !(isStreaming && response.events.length > 0)) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-800 flex items-center h-[48px]">
          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">Response</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">⏳</div>
            <p className="text-sm">Sending request...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-800 flex items-center h-[48px]">
          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">Response</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-2">❌</div>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-800 flex items-center h-[48px]">
          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">Response</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">Send a request to see the response</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-h-0">
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-800 flex items-center h-[48px] flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
            Response {isStreaming && <span className="text-blue-600 dark:text-blue-400">(SSE Stream)</span>}
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
                <span className="font-medium">Events:</span> {response.events.length}
              </span>
            ) : (
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Size:</span> {formatBytes(responseSize)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex px-6">
          {(['body', 'headers', 'test-results'] as ResponseTab[]).map(tab => (
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
              {tab === 'test-results' ? 'Test Results' : tab}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeResponseTab === 'body' && <ResponseBody />}
        {activeResponseTab === 'headers' && <ResponseHeaders />}
        {activeResponseTab === 'test-results' && <ResponseTests />}
      </div>
    </div>
  );
}
