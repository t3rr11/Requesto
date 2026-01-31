import { useState } from 'react';
import { ProxyResponse } from '../types';

interface ResponseViewerProps {
  response: ProxyResponse;
}

export default function ResponseViewer({ response }: ResponseViewerProps) {
  const [copied, setCopied] = useState(false);

  const formatBody = (body: string) => {
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  };

  const getStatusBadgeColor = (status: number) => {
    if (status === 0) return 'bg-red-100 text-red-700 border-red-200';
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-700 border-green-200';
    if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (status >= 400 && status < 500) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatBody(response.body));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Response</h2>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-md font-semibold text-sm border ${getStatusBadgeColor(response.status)}`}>
            {response.status} {response.statusText}
          </span>
          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-md">
            ⚡ {response.duration}ms
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Headers</h3>
          <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
            {Object.entries(response.headers).length > 0 ? (
              <dl className="space-y-1">
                {Object.entries(response.headers).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <dt className="inline font-medium text-gray-700">{key}:</dt>{' '}
                    <dd className="inline text-gray-600">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-gray-500">No headers</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Body</h3>
            <button
              onClick={copyToClipboard}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="bg-gray-50 rounded p-4 overflow-x-auto text-sm border border-gray-200 font-mono">
            <code>{formatBody(response.body)}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
