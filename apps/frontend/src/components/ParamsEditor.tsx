import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { VariableAwareInput } from './VariableAwareInput';

interface ParamRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface ParamsEditorProps {
  params: ParamRow[];
  onParamsChange: (params: ParamRow[]) => void;
  disabled?: boolean;
}

export function ParamsEditor({ params, onParamsChange, disabled = false }: ParamsEditorProps) {
  const [viewMode, setViewMode] = useState<'table' | 'bulk'>('table');
  const [bulkText, setBulkText] = useState('');

  const addParam = () => {
    onParamsChange([
      ...params,
      {
        id: Date.now().toString(),
        key: '',
        value: '',
        enabled: true,
      },
    ]);
  };

  const updateParam = (id: string, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    onParamsChange(params.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeParam = (id: string) => {
    const filtered = params.filter(p => p.id !== id);
    if (filtered.length === 0) {
      // If deleting the last param, replace with a new empty row
      onParamsChange([{
        id: Date.now().toString(),
        key: '',
        value: '',
        enabled: true,
      }]);
    } else {
      onParamsChange(filtered);
    }
  };

  const switchToBulkEdit = () => {
    // Convert current params to bulk text format
    const text = params
      .filter(p => p.key.trim() || p.value.trim())
      .map(p => `${p.key}=${p.value}`)
      .join('\n');
    setBulkText(text);
    setViewMode('bulk');
  };

  const switchToTableView = () => {
    // Parse bulk text into params
    const lines = bulkText.split('\n').filter(line => line.trim());
    const parsedParams = lines.map((line, index) => {
      const equalIndex = line.indexOf('=');
      if (equalIndex === -1) {
        return {
          id: (Date.now() + index).toString(),
          key: line.trim(),
          value: '',
          enabled: true,
        };
      }
      return {
        id: (Date.now() + index).toString(),
        key: line.substring(0, equalIndex).trim(),
        value: line.substring(equalIndex + 1).trim(),
        enabled: true,
      };
    });

    if (parsedParams.length > 0) {
      onParamsChange(parsedParams);
    } else {
      // If no params parsed, add a default empty row
      onParamsChange([
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
                {params.map(param => (
                  <tr key={param.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={param.enabled}
                        onChange={e => updateParam(param.id, 'enabled', e.target.checked)}
                        className="w-4 h-4"
                        disabled={disabled}
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        value={param.key}
                        onChange={e => updateParam(param.id, 'key', e.target.value)}
                        placeholder="Key"
                        className="w-full px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 bg-transparent border-none text-black dark:text-gray-200"
                        disabled={disabled}
                      />
                    </td>
                    <td className="py-2 px-1">
                      <VariableAwareInput
                        value={param.value}
                        onChange={value => updateParam(param.id, 'value', value)}
                        placeholder="Value"
                        disabled={disabled}
                        className="w-full px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 bg-transparent border-none text-black dark:text-gray-200"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => removeParam(param.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer disabled:opacity-50 p-1 inline-flex items-center justify-center"
                        disabled={disabled}
                        title="Delete param"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addParam} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-2" disabled={disabled}>
            + Add Param
          </button>
        </>
      ) : (
        <>
          {/* Bulk Edit View */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Enter one parameter per line in the format:{' '}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded dark:text-gray-300">key=value</code>
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
              placeholder="page=1&#10;limit=10&#10;search=query"
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
