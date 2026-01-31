import { useState } from 'react';
import { ProxyResponse } from '../types';
import { formatResponseBody, getStatusBadgeColor, formatBytes } from '../helpers/responseHelpers';
import Editor from '@monaco-editor/react';

type ResponseTab = 'body' | 'headers' | 'test-results';

interface ResponsePanelProps {
  response: ProxyResponse | null;
  loading: boolean;
  error: string | null;
}

export function ResponsePanel({ response, loading, error }: ResponsePanelProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');
  const responseSize = response?.body ? new Blob([response.body]).size : 0;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-6 bg-gray-50 flex items-center h-[48px]">
          <h3 className="font-medium text-sm text-gray-900">Response</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">
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
      <div className="flex-1 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-6 bg-gray-50 flex items-center h-[48px]">
          <h3 className="font-medium text-sm text-gray-900">Response</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-2">❌</div>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-6 bg-gray-50 flex items-center h-[48px]">
          <h3 className="font-medium text-sm text-gray-900">Response</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">Send a request to see the response</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Response Header */}
      <div className="border-b border-gray-200 px-6 bg-gray-50 flex items-center h-[48px]">
        <div className="flex items-center justify-between w-full">
          <h3 className="font-medium text-sm text-gray-900">Response</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-2 py-1 rounded font-medium ${getStatusBadgeColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
            <span className="text-gray-600">
              <span className="font-medium">Time:</span> {response.duration}ms
            </span>
            <span className="text-gray-600">
              <span className="font-medium">Size:</span> {formatBytes(responseSize)}
            </span>
          </div>
        </div>
      </div>

      {/* Response Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex px-6">
          {(['body', 'headers', 'test-results'] as ResponseTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'test-results' ? 'Test Results' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Response Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'body' && (
          <div className="h-full p-6">
            <div className="border border-gray-300 rounded overflow-hidden h-full">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={formatResponseBody(response.body)}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  readOnly: true,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="p-6">
            {Object.entries(response.headers).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(response.headers).map(([key, value]) => (
                  <div key={key} className="flex gap-4 text-sm border-b border-gray-100 pb-2">
                    <span className="font-medium text-gray-700 min-w-[200px]">{key}</span>
                    <span className="text-gray-600 flex-1 break-all">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No headers</p>
            )}
          </div>
        )}

        {activeTab === 'test-results' && (
          <div className="p-6 text-sm text-gray-600">
            <div className="text-gray-400">No tests defined</div>
          </div>
        )}
      </div>
    </div>
  );
}
