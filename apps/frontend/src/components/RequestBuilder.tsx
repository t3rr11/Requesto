import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { BatchHeadersForm } from '../forms/BatchHeadersForm';
import { Dialog } from './Dialog';
import { useRequestStore } from '../store/useRequestStore';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { useAlertStore } from '../store/useAlertStore';
import { requestApi } from '../helpers/api/request';

interface RequestBuilderProps {
  loading: boolean;
}

interface HeaderRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestBuilderRef {
  loadRequest: (item: { method: string; url: string; headers?: Record<string, string>; body?: string }) => void;
  getCurrentRequest: () => { method: string; url: string; headers?: Record<string, string>; body?: string } | null;
  setSavedRequestId: (id: string | undefined) => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const RequestBuilder = forwardRef<RequestBuilderRef, RequestBuilderProps>(function RequestBuilder(
  { loading },
  ref
) {
  const { setLoading, setResponse, setError, setCurrentSavedRequestId, currentRequestData, addConsoleLog } = useRequestStore();
  const { collections, updateRequest: updateCollectionRequest } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const [savedRequestId, setSavedRequestId] = useState<string | undefined>(undefined);
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<HeaderRow[]>([{ id: '1', key: '', value: '', enabled: true }]);
  const [body, setBody] = useState('');
  const [activeTab, setActiveTab] = useState<'headers' | 'body'>('headers');
  const [showBatchHeadersModal, setShowBatchHeadersModal] = useState(false);

  // Load request from store when currentRequestData changes
  useEffect(() => {
    if (currentRequestData) {
      setMethod(currentRequestData.method);
      setUrl(currentRequestData.url);
      setBody(currentRequestData.body || '');

      // Load headers
      if (currentRequestData.headers && Object.keys(currentRequestData.headers).length > 0) {
        const loadedHeaders = Object.entries(currentRequestData.headers).map(([key, value], index) => ({
          id: Date.now().toString() + index,
          key,
          value,
          enabled: true,
        }));
        setHeaders(loadedHeaders);
      } else {
        setHeaders([{ id: Date.now().toString(), key: '', value: '', enabled: true }]);
      }

      // Set saved request ID if it exists
      setSavedRequestId(currentRequestData.savedRequestId);

      // Switch to appropriate tab
      if (currentRequestData.body && ['POST', 'PUT', 'PATCH'].includes(currentRequestData.method)) {
        setActiveTab('body');
      } else {
        setActiveTab('headers');
      }
    }
  }, [currentRequestData]);

  const addHeader = () => {
    setHeaders([
      ...headers,
      {
        id: Date.now().toString(),
        key: '',
        value: '',
        enabled: true,
      },
    ]);
  };

  const updateHeader = (id: string, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    setHeaders(headers.map(h => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const removeHeader = (id: string) => {
    if (headers.length > 1) {
      setHeaders(headers.filter(h => h.id !== id));
    }
  };

  const handleBatchImport = (importedHeaders: Array<{ key: string; value: string }>) => {
    const newHeaders = importedHeaders.map((h, index) => ({
      id: (Date.now() + index).toString(),
      key: h.key,
      value: h.value,
      enabled: true,
    }));

    // Remove empty headers and add imported ones
    const existingHeaders = headers.filter(h => h.key.trim() || h.value.trim());
    setHeaders([...existingHeaders, ...newHeaders]);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to send request
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!loading && url.trim()) {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      return;
    }

    // Build headers object from enabled headers with non-empty keys
    const requestHeaders: Record<string, string> = {};
    headers.forEach(h => {
      if (h.enabled && h.key.trim()) {
        requestHeaders[h.key.trim()] = h.value;
      }
    });

    const requestData = {
      method,
      url: url.trim(),
      headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
      body: body.trim() || undefined,
    };

    // Clear saved request ID since this is a new/modified request
    setCurrentSavedRequestId(undefined);
    setSavedRequestId(undefined);

    // Send the request
    setLoading(true);
    setError(null);

    const startTime = Date.now();
    addConsoleLog({
      id: Date.now().toString(),
      timestamp: startTime,
      type: 'request',
      method: requestData.method,
      url: requestData.url,
    });

    try {
      const response = await requestApi.send(requestData);
      const duration = Date.now() - startTime;

      setResponse(response);
      addConsoleLog({
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
        type: 'response',
        method: requestData.method,
        url: requestData.url,
        status: response.status,
        duration,
      });
    } catch (error: any) {
      setError(error.message || 'Failed to send request');
      addConsoleLog({
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
        type: 'error',
        message: error.message || 'Failed to send request',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!url.trim() || !savedRequestId) return;

    // Build headers object from enabled headers with non-empty keys
    const requestHeaders: Record<string, string> = {};
    headers.forEach(h => {
      if (h.enabled && h.key.trim()) {
        requestHeaders[h.key.trim()] = h.value;
      }
    });

    const requestData = {
      method,
      url: url.trim(),
      headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
      body: body.trim() || undefined,
    };

    // Find the collection that contains this request
    const collection = collections.find(c => 
      c.requests.some(r => r.id === savedRequestId)
    );

    if (!collection) {
      showAlert('Collection Not Found', 'Could not find the collection for this request.', 'error');
      return;
    }

    try {
      await updateCollectionRequest(collection.id, savedRequestId, {
        method: requestData.method,
        url: requestData.url,
        headers: requestData.headers,
        body: requestData.body,
      });
      
      showAlert('Success', 'Request updated successfully!', 'success');
    } catch (error) {
      showAlert('Update Failed', 'Failed to update the request. Please try again.', 'error');
      console.error('Failed to update request:', error);
    }
  };

  // Expose method to load request from history
  useImperativeHandle(ref, () => ({
    loadRequest: (item: { method: string; url: string; headers?: Record<string, string>; body?: string }) => {
      setMethod(item.method);
      setUrl(item.url);
      setBody(item.body || '');

      // Load headers
      if (item.headers && Object.keys(item.headers).length > 0) {
        const loadedHeaders = Object.entries(item.headers).map(([key, value], index) => ({
          id: Date.now().toString() + index,
          key,
          value,
          enabled: true,
        }));
        setHeaders(loadedHeaders);
      } else {
        setHeaders([{ id: Date.now().toString(), key: '', value: '', enabled: true }]);
      }

      // Switch to appropriate tab
      if (item.body && ['POST', 'PUT', 'PATCH'].includes(item.method)) {
        setActiveTab('body');
      } else {
        setActiveTab('headers');
      }
    },
    getCurrentRequest: () => {
      if (!url.trim()) {
        return null;
      }

      // Build headers object from enabled headers with non-empty keys
      const requestHeaders: Record<string, string> = {};
      headers.forEach(h => {
        if (h.enabled && h.key.trim()) {
          requestHeaders[h.key] = h.value;
        }
      });

      return {
        method,
        url: url.trim(),
        headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
        body: body.trim() || undefined,
      };
    },
    setSavedRequestId: (id: string | undefined) => {
      setSavedRequestId(id);
    },
  }));

  const showBodyTab = ['POST', 'PUT', 'PATCH'].includes(method);

  return (
    <div className="bg-white border-b border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Request</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL Bar */}
        <div className="flex gap-2">
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {HTTP_METHODS.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>

          {savedRequestId && (
            <button
              type="button"
              onClick={handleUpdate}
              disabled={loading || !url.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Update
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('headers')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'headers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Headers
            </button>
            {showBodyTab && (
              <button
                type="button"
                onClick={() => setActiveTab('body')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'body'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Body
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'headers' && (
          <div className="space-y-2">
            {headers.map(header => (
              <div key={header.id} className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={header.enabled}
                  onChange={e => updateHeader(header.id, 'enabled', e.target.checked)}
                  className="w-4 h-4"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={header.key}
                  onChange={e => updateHeader(header.id, 'key', e.target.value)}
                  placeholder="Header name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={header.value}
                  onChange={e => updateHeader(header.id, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => removeHeader(header.id)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                  disabled={loading || headers.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addHeader}
                className="text-sm text-blue-600 hover:text-blue-700"
                disabled={loading}
              >
                + Add Header
              </button>
              <button
                type="button"
                onClick={() => setShowBatchHeadersModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                disabled={loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Batch Import
              </button>
            </div>
          </div>
        )}

        {activeTab === 'body' && showBodyTab && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Request Body</label>
              <div className="flex gap-2 text-xs text-gray-500">
                <span>💡 Tip: Press Ctrl+Enter to send request</span>
              </div>
            </div>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <Editor
                height="400px"
                defaultLanguage="json"
                value={body}
                onChange={value => setBody(value || '')}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  formatOnPaste: true,
                  formatOnType: true,
                  readOnly: loading,
                }}
              />
            </div>
          </div>
        )}
      </form>

      {showBatchHeadersModal && (
        <Dialog isOpen={true} onClose={() => setShowBatchHeadersModal(false)} title="Batch Import Headers" size="xl">
          <BatchHeadersForm
            onImport={headers => {
              handleBatchImport(headers);
              setShowBatchHeadersModal(false);
            }}
            onCancel={() => setShowBatchHeadersModal(false)}
          />
        </Dialog>
      )}
    </div>
  );
});

RequestBuilder.displayName = 'RequestBuilder';

export default RequestBuilder;
