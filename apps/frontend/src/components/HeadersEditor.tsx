import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { VariableAwareInput } from './VariableAwareInput';

interface HeaderRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface HeadersEditorProps {
  headers: HeaderRow[];
  onHeadersChange: (headers: HeaderRow[]) => void;
  disabled?: boolean;
}

export function HeadersEditor({ headers, onHeadersChange, disabled = false }: HeadersEditorProps) {
  const [viewMode, setViewMode] = useState<'table' | 'bulk'>('table');
  const [bulkText, setBulkText] = useState('');

  const addHeader = () => {
    onHeadersChange([
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
    onHeadersChange(headers.map(h => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const removeHeader = (id: string) => {
    const filtered = headers.filter(h => h.id !== id);
    if (filtered.length === 0) {
      // If deleting the last header, replace with a new empty row
      onHeadersChange([{
        id: Date.now().toString(),
        key: '',
        value: '',
        enabled: true,
      }]);
    } else {
      onHeadersChange(filtered);
    }
  };

  const switchToBulkEdit = () => {
    // Convert current headers to bulk text format
    const text = headers
      .filter(h => h.key.trim() || h.value.trim())
      .map(h => `${h.key}:${h.value}`)
      .join('\n');
    setBulkText(text);
    setViewMode('bulk');
  };

  const switchToTableView = () => {
    // Parse bulk text into headers
    const lines = bulkText.split('\n').filter(line => line.trim());
    const parsedHeaders = lines.map((line, index) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        return {
          id: (Date.now() + index).toString(),
          key: line.trim(),
          value: '',
          enabled: true,
        };
      }
      return {
        id: (Date.now() + index).toString(),
        key: line.substring(0, colonIndex).trim(),
        value: line.substring(colonIndex + 1).trim(),
        enabled: true,
      };
    });

    if (parsedHeaders.length > 0) {
      onHeadersChange(parsedHeaders);
    } else {
      // If no headers parsed, add a default empty row
      onHeadersChange([
        {
          id: Date.now().toString(),
          key: '',
          value: '',
          enabled: true,
        },
      ]);
    }
    setViewMode('table');
  };

  return (
    <div className="space-y-2">
      {viewMode === 'table' ? (
        <>
          {/* Table View */}
          <div className="border border-gray-300 dark:border-gray-700 rounded">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left text-xs font-medium text-gray-600 dark:text-gray-400 py-2 px-3 w-10"></th>
                  <th className="text-left text-xs font-medium text-gray-600 dark:text-gray-400 py-2 px-3">Key</th>
                  <th className="text-left text-xs font-medium text-gray-600 dark:text-gray-400 py-2 px-3">Value</th>
                  <th className="text-right text-xs font-medium text-gray-600 dark:text-gray-400 py-2 px-3 w-24">
                    <button
                      onClick={switchToBulkEdit}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      disabled={disabled}
                    >
                      Bulk Edit
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {headers.map(header => (
                  <tr key={header.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={header.enabled}
                        onChange={e => updateHeader(header.id, 'enabled', e.target.checked)}
                        className="w-4 h-4"
                        disabled={disabled}
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        value={header.key}
                        onChange={e => updateHeader(header.id, 'key', e.target.value)}
                        placeholder="Key"
                        className="w-full px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 bg-transparent border-none text-black dark:text-gray-200"
                        disabled={disabled}
                      />
                    </td>
                    <td className="py-2 px-1">
                      <VariableAwareInput
                        value={header.value}
                        onChange={value => updateHeader(header.id, 'value', value)}
                        placeholder="Value"
                        disabled={disabled}
                        className="w-full px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 bg-transparent border-none text-black dark:text-gray-200"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => removeHeader(header.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer disabled:opacity-50 p-1 inline-flex items-center justify-center"
                        disabled={disabled}
                        title="Delete header"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addHeader} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-2" disabled={disabled}>
            + Add Header
          </button>
        </>
      ) : (
        <>
          {/* Bulk Edit View */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Enter one header per line in the format:{' '}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded dark:text-gray-300">key:value</code>
              </div>
              <button
                onClick={switchToTableView}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                disabled={disabled}
              >
                Table View
              </button>
            </div>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder="Content-Type:application/json&#10;Authorization:Bearer token&#10;Accept:application/json"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono dark:bg-gray-800 dark:text-gray-200"
              rows={12}
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  );
}
