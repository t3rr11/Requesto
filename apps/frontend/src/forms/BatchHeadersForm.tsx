import { useState } from 'react';
import { Button } from '../components/Button';

interface BatchHeadersFormProps {
  onImport: (headers: Array<{ key: string; value: string }>) => void;
  onCancel: () => void;
}

export const BatchHeadersForm: React.FC<BatchHeadersFormProps> = ({ onImport, onCancel }) => {
  const [inputText, setInputText] = useState('');
  const [format, setFormat] = useState<'auto' | 'keyvalue' | 'json'>('auto');
  const [preview, setPreview] = useState<Array<{ key: string; value: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const parseHeaders = (text: string, selectedFormat: string) => {
    const headers: Array<{ key: string; value: string }> = [];
    setError(null);

    try {
      // Try JSON format
      if (selectedFormat === 'json' || (selectedFormat === 'auto' && text.trim().startsWith('{'))) {
        const parsed = JSON.parse(text);
        Object.entries(parsed).forEach(([key, value]) => {
          headers.push({ key, value: String(value) });
        });
        return headers;
      }

      // Parse line by line
      const lines = text.split('\n').filter(line => line.trim());

      for (const line of lines) {
        // curl -H format: -H "Header: Value" or -H 'Header: Value'
        if (line.includes('-H') || line.includes('--header')) {
          const match =
            line.match(/[-]H\s+["']([^:]+):\s*([^"']+)["']/i) || line.match(/--header\s+["']([^:]+):\s*([^"']+)["']/i);
          if (match) {
            headers.push({ key: match[1].trim(), value: match[2].trim() });
            continue;
          }
        }

        // Standard "Key: Value" format
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          if (key && value) {
            headers.push({ key, value });
          }
        }
      }

      if (headers.length === 0) {
        setError('No headers found. Use "Key: Value" format, one per line.');
      }
    } catch (err) {
      setError('Failed to parse headers. Check format and try again.');
    }

    return headers;
  };

  const handlePreview = () => {
    const parsed = parseHeaders(inputText, format);
    setPreview(parsed);
  };

  const handleImport = () => {
    if (preview.length > 0) {
      onImport(preview);
    } else {
      handlePreview();
    }
  };

  const exampleFormats = {
    keyvalue: `Content-Type: application/json
Authorization: Bearer token123
Accept: application/json`,
    curl: `-H "Content-Type: application/json"
-H "Authorization: Bearer token123"
-H "Accept: application/json"`,
    json: `{
  "Content-Type": "application/json",
  "Authorization": "Bearer token123",
  "Accept": "application/json"
}`,
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Paste multiple headers at once</p>

      {/* Format Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</label>
        <div className="flex gap-2">
          <Button onClick={() => setFormat('auto')} variant={format === 'auto' ? 'primary' : 'secondary'} size="sm">
            Auto-detect
          </Button>
          <Button
            onClick={() => setFormat('keyvalue')}
            variant={format === 'keyvalue' ? 'primary' : 'secondary'}
            size="sm"
          >
            Key: Value
          </Button>
          <Button onClick={() => setFormat('json')} variant={format === 'json' ? 'primary' : 'secondary'} size="sm">
            JSON
          </Button>
        </div>
      </div>

      {/* Input Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paste Headers</label>
        <textarea
          value={inputText}
          onChange={e => {
            setInputText(e.target.value);
            setPreview([]);
            setError(null);
          }}
          placeholder={exampleFormats[format === 'auto' ? 'keyvalue' : format]}
          className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preview ({preview.length} header{preview.length !== 1 ? 's' : ''})
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Header
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {preview.map((header, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-100">{header.key}</td>
                    <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400">{header.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Examples */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Supported Formats:</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>
            • <strong>Key: Value</strong> - Standard HTTP header format
          </li>
          <li>
            • <strong>curl -H</strong> - Copy from curl commands
          </li>
          <li>
            • <strong>JSON</strong> - Paste JSON object with headers
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button onClick={handlePreview} disabled={!inputText.trim()} variant="secondary" size="md">
          Preview
        </Button>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="ghost" size="md">
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!inputText.trim()} variant="primary" size="md">
            Import {preview.length > 0 ? `${preview.length} Headers` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};
