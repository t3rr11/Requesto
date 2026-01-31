import { useState } from 'react';
import { Control, Controller } from 'react-hook-form';
import { z } from 'zod';
import Editor from '@monaco-editor/react';
import { Button } from '../components/Button';
import { HeadersEditor } from '../components/HeadersEditor';

export const requestFormSchema = z.object({
  method: z.string(),
  url: z.string().min(1, 'URL is required'),
  headers: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      value: z.string(),
      enabled: z.boolean(),
    })
  ),
  body: z.string(),
  savedRequestId: z.string().optional(),
});

export type RequestFormData = z.infer<typeof requestFormSchema>;

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

type RequestTab = 'params' | 'auth' | 'headers' | 'body' | 'scripts' | 'settings';

interface RequestFormProps {
  control: Control<RequestFormData>;
  onSend: () => void;
  loading: boolean;
  urlValue: string;
  headers: RequestFormData['headers'];
  onHeadersChange: (headers: RequestFormData['headers']) => void;
}

export function RequestForm({ control, onSend, loading, urlValue, headers, onHeadersChange }: RequestFormProps) {
  const [activeTab, setActiveTab] = useState<RequestTab>('headers');

  return (
    <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
      {/* Request Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex gap-2">
          <div className="flex flex-1">
            <Controller
              name="method"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  disabled={loading}
                >
                  {HTTP_METHODS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            />

            <Controller
              name="url"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Enter request URL"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md ml-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={loading}
                />
              )}
            />
          </div>

          <Button onClick={onSend} disabled={loading || !urlValue.trim()} loading={loading} size="sm">
            Send
          </Button>
        </div>
      </div>

      {/* Request Tabs */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex px-6 h-[48px]">
          {(['params', 'auth', 'headers', 'body', 'scripts', 'settings'] as RequestTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Request Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'params' && (
          <div className="text-sm text-gray-600">
            <p className="mb-4">Query parameters will be added to the URL.</p>
            <div className="text-gray-400">Coming soon...</div>
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="text-sm text-gray-600">
            <p className="mb-4">Configure authentication for this request.</p>
            <div className="text-gray-400">Coming soon...</div>
          </div>
        )}

        {activeTab === 'headers' && (
          <HeadersEditor headers={headers} onHeadersChange={onHeadersChange} disabled={loading} />
        )}

        {activeTab === 'body' && (
          <div className="h-full">
            <div className="mb-3 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="bodyType" value="json" defaultChecked />
                <span>JSON</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="radio" name="bodyType" value="xml" disabled />
                <span>XML</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="radio" name="bodyType" value="form" disabled />
                <span>Form Data</span>
              </label>
            </div>
            <div className="border border-gray-300 rounded overflow-hidden" style={{ height: 'calc(100% - 40px)' }}>
              <Controller
                name="body"
                control={control}
                render={({ field }) => (
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={field.value}
                    onChange={value => field.onChange(value || '')}
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
                )}
              />
            </div>
          </div>
        )}

        {activeTab === 'scripts' && (
          <div className="text-sm text-gray-600">
            <p className="mb-4">Add pre-request and test scripts.</p>
            <div className="text-gray-400">Coming soon...</div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="text-sm text-gray-600">
            <p className="mb-4">Configure request settings.</p>
            <div className="text-gray-400">Coming soon...</div>
          </div>
        )}
      </div>
    </div>
  );
}
